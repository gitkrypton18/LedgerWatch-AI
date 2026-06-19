# LedgerWatch AI: Exhaustive Codebase Documentation

This document serves as the **ultimate, line-by-line, and function-by-function reference** for the entire LedgerWatch AI project. Every single file, module, and React component is deeply analyzed to explain its purpose, its inputs/outputs, and how it fits into the broader Fraud Detection ecosystem.

LedgerWatch AI is an unsupervised machine learning platform that detects anomalies in financial transactions and invoices using an **Isolation Forest** model, visualizes explanations using **SHAP**, and manages data via a **FastAPI** backend and **React** frontend.

---

## 1. Core Platform Architecture

### The Data Flow
1. **Frontend (React)**: Users upload CSVs of transactions or images of invoices.
2. **FastAPI Endpoints**: The requests hit `backend/main.py`.
3. **Data Ingestion**: Large files are processed in chunks (`data_ingest.py`), and OCR is applied to images (`ocr_service.py`).
4. **Feature Engineering**: Raw data is mathematically transformed into 24 features (`features.py`).
5. **AI Inference**: The pre-trained Isolation Forest model (`train.py`) assigns an anomaly score.
6. **Risk Engine Calibration**: Raw scores are mapped to a 0-100 scale (`risk_engine.py`).
7. **SHAP Explanations**: The model explains its decisions by attributing scores to specific features (`explain.py`).
8. **Persistence**: Transactions and their scores are saved to SQLite (`database.py`).

---

## 2. Backend Detailed File Analysis (`backend/`)

### 2.1 `backend/main.py`
This is the heart of the backend application. It defines the FastAPI application, manages middleware, and registers all REST endpoints.

#### Functions & Endpoints:
* **`app = FastAPI(...)`**: Initializes the core server, configuring the title, version, and CORS middleware (which explicitly allows all origins/methods so the React frontend can communicate with it).
* **`get_risk_band(score: int) -> str`**: A utility function. It takes a raw integer score (0-100) and maps it to a human-readable string: `0-49` (Low), `50-75` (Medium), `76-90` (High), `91-100` (Critical).
* **`get_feature_columns(df) -> List[str]`**: Scans a pandas DataFrame and dynamically extracts column names that are meant for the ML model, discarding metadata like `id` or `timestamp`.
* **`engineer_features_from_df(df) -> pd.DataFrame`**: An integration wrapper. It takes a raw DataFrame constructed from incoming API requests and delegates it to `features.engineer_all_features(df)` to calculate the 24 ML inputs.
* **`align_features(X, expected_features) -> pd.DataFrame`**: A critical data-integrity function. When the frontend sends a single transaction, it might be missing calculated columns (like rolling averages from historical data). This function compares the incoming features to what the model expects, injecting zeros where data is missing, guaranteeing the model won't crash with a `ValueError`.
* **`predict_single(data: dict, explain: bool)`**: The core function handling `POST /predict`. It accepts a single JSON transaction, converts it to a DataFrame, engineers features, calls the model prediction, runs the Risk Engine, and optionally invokes the SHAP explainer.
* **`_get_file_extension(filename)` & `_validate_extension(ext, allowed)`**: Helper utilities for security, ensuring users only upload valid CSVs or supported image formats (PDF, PNG, JPEG).
* **`validate_required_columns(df, required_cols)`**: A strict schema enforcer. Before the batch processor spends time parsing a 100MB CSV, this checks if the absolute bare-minimum columns exist.
* **`process_dataframe_batch(df, explain)`**: The heavy lifter for `POST /batch-predict`. It handles massive DataFrames efficiently, running the entire feature engineering, model scoring, and risk engine loop on thousands of rows simultaneously.
* **`router` endpoints (`/health`, `/predict`, `/batch-predict`, `/ocr`, `/transactions`, `/stats`)**: The HTTP route definitions. For example, `/transactions` reads from the SQLite database, returning paginated data for the frontend tables. `/stats` aggregates total transactions and average anomaly rates.

### 2.2 `backend/src/auth.py`
Handles all authentication and security for the application.
* **`pwd_context = CryptContext(schemes=["bcrypt"])`**: Configures the password hashing algorithm using `passlib`.
* **`verify_password(plain_password, hashed_password) -> bool`**: Cryptographically compares an incoming login attempt with the stored hashed password.
* **`get_password_hash(password) -> str`**: Salts and hashes a raw string password before saving it to the database.
* **`create_access_token(data: dict, expires_delta)`**: Creates a secure JSON Web Token (JWT) that encodes the user's session data. It sets an expiration time to prevent permanent sessions.

### 2.3 `backend/src/config.py`
Manages all environment variables and constant configurations.
* **`class Settings(BaseSettings)`**: A Pydantic class that automatically reads the `.env` file and casts variables to their appropriate Python types (e.g., `DATABASE_URL` as a string, `BATCH_SIZE` as an integer).
* **`validate_paths()`**: A startup validation script. It checks the filesystem to ensure `isolation_forest_v1.0.0.joblib` and `risk_engine_v1.0.0.joblib` actually exist in the `saved_models` directory before the server starts accepting requests.

### 2.4 `backend/src/data_ingest.py`
Built to handle massive datasets without consuming all system RAM.
* **`ingest_csv_in_chunks(file_path, chunk_size)`**: A generator function. Instead of loading a 6.3 million row CSV entirely into RAM (which would crash low-tier servers), it yields small chunks of data (e.g., 10,000 rows) as pandas DataFrames, allowing iterative processing.
* **`clean_data(df)`**: A standardization function. It strips accidental whitespace from column names, drops completely empty rows, fills NaN values with logical defaults, and enforces specific pandas data types (like `float64` for amounts).

### 2.5 `backend/src/database.py`
The SQLAlchemy ORM configuration.
* **`engine`, `SessionLocal`, `Base`**: The foundational setup for connecting to the SQLite database `ledgerwatch.db`.
* **`get_db()`**: A FastAPI dependency function. It creates a new database connection when an API request begins, and executes `db.close()` in a `finally` block when the request ends, preventing database connection leaks.
* **`class Transaction(Base)`**: Defines the database schema. It contains columns for `id`, `amount`, `type`, `oldbalanceOrg`, `newbalanceOrig`, `risk_score`, `risk_band`, and `is_fraud`. It also maps SHAP explanations into a JSON column.
* **`class User(Base)`**: Defines the user schema for authentication, storing the hashed password.

### 2.6 `backend/src/features.py`
The mathematical core of the data pipeline. It transforms raw business data into numeric signals that the AI can understand.
* **`engineer_all_features(df)`**: The master pipeline. It runs the DataFrame through a sequence of internal transformation functions.
* **`_log_transform_amount(df)`**: Applies `np.log1p()` to the transaction amount. Why? Because financial transfers range from $1 to $10,000,000. A logarithmic scale normalizes these massive differences, preventing the AI from blindly flagging all large numbers.
* **`_encode_cyclical_time(df)`**: Converts the hour of the day into sine and cosine transformations. This ensures the AI mathematically understands that 23:00 (11 PM) and 01:00 (1 AM) are actually close together in time, rather than far apart numerically.
* **`_balance_diffs(df)`**: Calculates the exact difference between `oldbalance` and `newbalance`.
* **`_zero_balance_flags(df)`**: A critical fraud indicator. It creates binary (1/0) columns flagging if the originator or destination account's balance went exactly to zero after the transfer.

### 2.7 `backend/src/train.py` & `backend/src/risk_engine.py`
These files define and calibrate the Machine Learning models.
* **`class IsolationForestModel`**: A custom wrapper around scikit-learn's `IsolationForest`. 
  * `train(X)`: Fits the trees to the data, figuring out how to partition normal transactions versus anomalies.
  * `predict(X)`: Returns raw anomaly scores.
  * `save_model() / load_model()`: Uses `joblib` to serialize the massive mathematical objects to disk.
* **`class RiskEngine`**: Takes the raw, confusing scores output by the Isolation Forest (which might range arbitrarily) and uses percentiles to calibrate them into a smooth 0-100 scale. `fit(scores)` computes the cutoffs on the training data, and `transform(score)` applies it to new real-time data.

### 2.8 `backend/src/explain.py`
The interpretability layer, arguably the most important feature for human analysts.
* **`class SHAPExplainer`**: A wrapper for the `shap.TreeExplainer`.
* **`explain_prediction(transaction_features)`**: Calculates SHAP values (the mathematical contribution of each feature to the final score).
  * **Crucial Detail:** The raw Isolation Forest model outputs *lower* numbers for higher risk. The Risk Engine outputs *higher* numbers for higher risk. This function manually **flips the sign** of the SHAP values so that positive SHAP values correctly correlate to "increased anomaly risk" in the frontend visuals.
* **`get_top_features(shap_values)`**: Sorts the SHAP values by absolute magnitude to return a clean dictionary of the Top 5 reasons why a transaction was flagged.

### 2.9 `backend/src/ocr_service.py`
The optical character recognition module for unstructured invoices.
* **`extract_text(file_path)`**: If the file is a PDF, it uses `PyMuPDF` (`fitz`) to render it as an image. Then, it uses `pytesseract` to read all text from the image.
* **`_parse_amount(text)`**: Uses Regular Expressions (Regex) like `r'Total\s*[:$]\s*([\d,]+\.?\d*)'` to hunt through the raw OCR text string and extract the final invoice total.
* **`_parse_date(text)`**: Uses Regex to find dates in formats like `YYYY-MM-DD` or `MM/DD/YYYY`.
* **Mock Fallback**: If Tesseract is not installed on the host system (like a free-tier Render server), the class has a built-in fallback mode that synthetically parses the filename or returns default anomalous values so the application doesn't crash completely.

### 2.10 `backend/src/schemas.py`
The Pydantic definition file.
* Contains classes like `TransactionCreate`, `PredictionResult`, `HealthResponse`, `Token`, `UserCreate`. 
* **Purpose:** These classes strictly define the JSON structure required by FastAPI. If the React frontend sends a request missing a required field (like `amount`), Pydantic will automatically reject the request with a 422 Unprocessable Entity error before it ever reaches the Python logic.

---

## 3. Frontend Detailed File Analysis (`frontend/`)

The React frontend provides a state-of-the-art UI, leveraging `lucide-react` for iconography, `recharts` for data visualization, and Tailwind CSS for rapid styling.

### 3.1 `frontend/src/App.jsx` & `frontend/src/main.jsx`
* **`main.jsx`**: The entry point. Imports React, ReactDOM, and wraps the app in browser `StrictMode`. Injects the main component into `<div id="root">`.
* **`App.jsx`**: The React Router v6 setup. It defines all the URL paths (`/`, `/upload`, `/transactions`, `/explain`, `/analytics`, `/settings`). It wraps all pages in the `Layout` component to provide the persistent sidebar.

### 3.2 `frontend/src/index.css`
* The master stylesheet configuring Tailwind.
* **Custom Properties**: Defines root CSS variables for the color palette (`--bg-primary`, `--accent-info`).
* **Animations**: Contains `@keyframes` definitions for smooth UI interactions, like `fadeInUp` (for page load animations), `pulse-soft` (for live status indicators), and `rocket` (for the login sequence).

### 3.3 Pages (`frontend/src/pages/`)

#### `Dashboard.jsx`
* **Purpose**: The high-level executive summary view.
* **Functions/Logic**: 
  * Uses the `useStats()` hook to poll the backend `/stats` endpoint.
  * Calculates key metrics dynamically, such as the overall `anomalyRate` by dividing anomalies detected by total transactions.
  * Renders `MetricCard` components.
  * Utilizes `Recharts` to draw an `AreaChart` of recent anomaly distributions, showing trends over time.

#### `UploadPage.jsx`
* **Purpose**: The data ingestion interface for CSVs and Invoices.
* **Functions/Logic**:
  * Implements a drag-and-drop zone using standard DOM events (`onDragOver`, `onDrop`).
  * `handleFiles(files)`: Validates file extensions (`.csv`, `.pdf`, `.png`).
  * Manages uploading states. For CSVs, it hits `/batch-predict`. For images, it hits `/ocr`.
  * Simulates upload progress bars using a `setInterval` loop to give the user visual feedback while the backend processes massive files.

#### `TransactionsPage.jsx`
* **Purpose**: The core analytical table for investigating individual data points.
* **Functions/Logic**:
  * Manages significant state: `search` text, `riskFilter` (All, Critical, High, etc.), and `currentPage` (pagination).
  * Uses `useEffect` to trigger the `useTransactions` API hook whenever the page or filters change.
  * Maps over the fetched `transactions` array, rendering table rows.
  * `handleRowClick(tx)`: Updates the selected transaction state, which triggers the `DetailDrawer` component to slide into view from the right side.

#### `ExplainabilityPage.jsx`
* **Purpose**: A deep-dive visual interface into the SHAP logic.
* **Functions/Logic**:
  * Fetches the specific transaction's SHAP values from the database.
  * Renders the `ShapWaterfallChart`, providing context on the math.
  * Contains hardcoded descriptive logic explaining the difference between "Global Explainability" (how the model acts broadly) and "Local Explainability" (why *this specific* row was flagged).

#### `AnalyticsPage.jsx`
* **Purpose**: A dashboard proving the model's validity.
* **Functions/Logic**:
  * Mostly static charts demonstrating ROC-AUC (Receiver Operating Characteristic) curves and Lift percentiles.
  * Used to convince business stakeholders that the unsupervised Isolation Forest mathematically outperforms random guessing by a massive margin.

#### `SettingsPage.jsx`
* **Purpose**: User configuration and state reset.
* **Functions/Logic**:
  * Holds a large configuration object in `useState`.
  * `saveSettings()`: Serializes preferences into browser `localStorage`.
  * `testConnection()`: Fires a request to the backend `/health` endpoint to verify the API URL is correct.
  * Contains a "Danger Zone" module for clearing local cache, exporting data, or permanently wiping session state.

#### `LoginPage.jsx`
* **Purpose**: Securing the application.
* **Functions/Logic**:
  * A controlled form taking `email` and `password`.
  * Hits `/users/register` or `/token` depending on the toggle state.
  * On success, it saves the `access_token` to `localStorage` and optionally hits `/transactions/clear` to wipe the DB for a fresh session experience.

### 3.4 Custom Hooks (`frontend/src/hooks/useApi.js`)
Abstracts all network requests away from the UI components.
* **`useHealth()`**: Continuously polls the `/health` endpoint every 30 seconds using `setInterval`, updating global state if the backend goes down.
* **`useStats() / useTransactions() / useTransaction()`**: Standard `useEffect` data-fetching hooks that manage `data`, `loading`, and `error` states, guaranteeing UI components know exactly when to show spinners or error alerts.
* **`usePredict() / useBatchPredict() / useOCR()`**: Mutation hooks. They export a function (e.g., `upload()`) that the UI can call, internally managing the POST request, tracking progress percentiles, and handling `try/catch` exceptions.

### 3.5 Components (`frontend/src/components/`)
* **`DetailDrawer.jsx`**: A sliding pane. Takes a transaction ID, fetches its full payload, and renders a mini-dashboard for that specific event, including the `ShapWaterfallChart`.
* **`ShapWaterfallChart.jsx`**: Takes a `shap_values` object. Normalizes the data into a format Recharts expects (mapping base values to cumulative values) to create the step-by-step waterfall visual. It conditionally colors bars red if they push the anomaly score higher, and green if they push it lower.
* **`StatusBadge.jsx`**: An aesthetic wrapper. Takes strings like "Critical" and returns fully styled, rounded HTML spans with corresponding Tailwind color classes (e.g., `bg-red-500/10 text-red-400`).

---

## 4. Notable Architecture Decisions & Problem Solving

1. **Why Isolation Forest over LOF?**
   * **Scale:** Local Outlier Factor requires O(n²) time complexity. On 6.3 million transactions, it would never finish. Isolation Forest uses random tree partitioning, operating in O(n log n) time, completing training in ~3 minutes.
2. **Handling Single Transactions in Real-Time:**
   * The model was trained on bulk data, expecting rolling averages and 24 features. A single live transaction lacks this historical context. The `align_features()` backend function automatically detects missing columns and injects zeros or default averages to prevent server crashes during live predictions.
3. **The SHAP Directionality Fix:**
   * Isolation forest outputs *negative* scores for anomalies. Risk Engine outputs *positive* 0-100 scores for anomalies. We implemented a deliberate mathematical sign flip in `explain.py` so the SHAP visualizations intuitively match the Risk Engine (positive = bad).
4. **Resilient Data Ingestion:**
   * Uploading a 2GB CSV would crash the server's RAM. The `data_ingest.py` system processes files using pandas `chunksize`, reading, evaluating, and saving batches of 10,000 rows sequentially.

---
*Generated by Antigravity IDE Agent for complete structural transparency.*
