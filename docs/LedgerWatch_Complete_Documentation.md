# LedgerWatch AI: Complete Documentation & Technical Deep Dive
**Production-Grade Fraud Detection Platform**

## 1. Project Overview & Core Idea
**LedgerWatch AI** is a full-stack financial transaction anomaly detection platform. The core idea is to catch fraudulent financial transactions and anomalous invoices without relying on pre-labeled fraud data (which is extremely rare in the real world). 

To achieve this, the system uses an **unsupervised machine learning model** (Isolation Forest) trained on over 6.3 million transactions. Instead of a simple "yes/no" for fraud, it scores every transaction from 0-100 (Risk Engine) and explains *exactly* why it flagged a transaction using **SHAP** (SHapley Additive exPlanations). This allows human analysts to review visual waterfall charts to understand the AI's decision. 

Non-technical summary: We built an AI watchdog that looks at millions of bank transfers, learns what "normal" looks like, and flags the weird ones with a clear, visual explanation of why they look suspicious.

---

## 2. Complete Flow Pipeline (How It Works)

The pipeline is split into three main flows:

### A. The Transaction Flow (CSV Upload)
1. **User Action:** A user drags and drops a CSV file of transactions into the React Dashboard.
2. **Request Sent:** The Frontend sends a batch-predict request via the FastAPI Backend.
3. **Data Processing (`data_ingest.py` & `features.py`):** The Backend cleans the data and extracts 24 mathematical "features" (e.g., "Is the amount unusually round?", "Is the balance zeroed out?").
4. **AI Scoring (`train.py` & `risk_engine.py`):** The Isolation Forest model analyzes the features and detects anomalies. The Risk Engine translates the raw math into a simple 0-100 risk score.
5. **Explanation (`explain.py`):** The SHAP system generates a "why" for the score (e.g., "This transaction was flagged mainly because the amount was suspiciously large for this time of day").
6. **Response & Display:** The Backend sends the results back to the React UI, which renders beautiful charts, risk rings, and a table of transactions.

### B. The Invoice Flow (OCR)
1. **User Action:** User uploads a PDF or image of an invoice.
2. **Text Extraction (`ocr_service.py`):** Tesseract (an Optical Character Recognition tool) reads the image and turns it into raw text.
3. **Structuring Data:** Regex patterns automatically pull out the Amount, Date, Vendor, and Type.
4. **Integration:** This structured data is fed into the same AI pipeline as the CSV transactions to be scored for fraud.

---

## 3. Comprehensive File-by-File & Function-by-Function Documentation

This section provides a deep dive into every single file in the project, detailing exactly what each function and class inside them does.

### A. Backend Core (`backend/`)

#### `backend/main.py`
The central FastAPI application. It wires the web server to the Python ML logic.
* **`get_risk_band(score: int) -> str`**: A helper function that takes a numeric risk score (0-100) and maps it to a human-readable categorical band ("Low", "Medium", "High", "Critical").
* **`get_feature_columns(df) -> List[str]`**: Extracts the active ML feature column names from a pandas DataFrame to ensure consistency before prediction.
* **`engineer_features_from_df(df) -> pd.DataFrame`**: An integration wrapper that takes raw incoming JSON payloads, converts them to a DataFrame, and passes them through the feature engineering pipeline.
* **`align_features(X, expected_features) -> pd.DataFrame`**: A critical safeguard function. If a single incoming transaction is missing columns (like historical rolling averages) that the AI expects, this function injects them with default values (zeros) so the model doesn't crash.
* **`predict_single(...)`**: The logic behind the `POST /predict` endpoint. It processes a single transaction, runs it through the Isolation Forest, passes the anomaly score to the Risk Engine, and (optionally) generates SHAP explanations.
* **`_get_file_extension(filename)` / `_validate_extension(ext)`**: Internal utilities for the batch upload endpoints to prevent malicious or unsupported file types.
* **`validate_required_columns(df)`**: Asserts that uploaded CSVs contain all necessary schema columns before processing begins.
* **`process_dataframe_batch(...)`**: The engine behind `POST /batch-predict`. It handles massive CSV files by chunking them, running batch predictions, and aggregating the results without overflowing server RAM.
* **Endpoints**: Includes router definitions for `/health`, `/predict`, `/batch-predict`, `/ocr`, `/transactions`, and `/stats`.

#### Utilities (`backend/*.py`)
* **`generate_invoices.py` / `generate_invoice.py`**: 
  * `create_invoice(...)`: Uses Python imaging libraries (like PIL) to programmatically draw text onto a blank image, creating a synthetic invoice.
  * `create_anomalous_invoice(...)`: Generates fake invoices specifically crafted with conflicting amounts or dates to test the OCR engine's error handling.
* **`test_model.py` / `test_risk.py` / `evaluate_dataset.py`**: Scripts containing `pytest` assertions and manual run blocks to test the Isolation forest serialization and the Risk Engine calibrations.

### B. Backend ML Modules (`backend/src/`)

#### `auth.py`
* **`verify_password(plain, hashed)`**: Uses `passlib` to cryptographically verify passwords/keys.
* **`get_password_hash(password)`**: Hashes a new API key using bcrypt.
* **`create_access_token(...)`**: Generates a JSON Web Token (JWT) with an expiration delta for secure frontend sessions.

#### `config.py`
* **`class Settings(BaseSettings)`**: Inherits from Pydantic. Automatically maps `.env` file variables (like `DATABASE_URL` and `MODEL_PATH`) to Python variables with strict type checking.
* **`validate_paths()`**: A startup hook that checks if the physical `.joblib` model files exist on the disk. If not, the application fails immediately instead of crashing later during a prediction.

#### `data_ingest.py`
* **`ingest_csv_in_chunks(...)`**: Reads massive, multi-gigabyte CSVs in discrete chunks (e.g., 10,000 rows at a time) using pandas.
* **`clean_data(df)`**: Standardizes raw data, dropping nulls, stripping whitespace from strings, and casting columns to correct data types.

#### `database.py`
* **`get_db()`**: A FastAPI dependency generator that creates an SQLAlchemy database session per request and safely closes it afterward.
* **`class Transaction`**: The SQLAlchemy ORM model that defines the exact columns (id, amount, type, risk_score) for the SQLite database.

#### `evaluate.py`
* **`evaluate_performance(y_true, y_pred)`**: Compares the model's anomaly predictions against actual fraud labels (used *only* during evaluation, never training).
* **Calculations inside:** Computes ROC-AUC, Lift at Top 1%, and Precision/Recall to prove the unsupervised model's effectiveness.

#### `explain.py`
* **`class SHAPExplainer`**: A wrapper around the `shap` library.
* **`__init__()`**: Loads the Isolation Forest model into a `shap.TreeExplainer`.
* **`explain_prediction(transaction_features)`**: The core function. It calculates SHAP values for a single transaction. Critically, it mathematically **flips the sign** of the SHAP values so that positive numbers correctly align with "increased anomaly risk."
* **`get_top_features(...)`**: Sorts the SHAP values to return the top 5 reasons *why* a transaction was flagged.

#### `features.py`
* **`engineer_all_features(df)`**: The master pipeline that calls all individual feature transformations in sequence.
* **`_log_transform_amount(df)`**: Applies `np.log1p()` to transaction amounts to normalize extreme outliers (e.g., $90 million transfers).
* **`_encode_cyclical_time(df)`**: Converts the 24-hour transaction time into sine and cosine waves, allowing the ML model to understand that 23:00 and 01:00 are close in time.

#### `ocr_service.py`
* **`class InvoiceOCR`**: The main orchestrator for Tesseract.
* **`extract_text(image_path)`**: Converts a PDF to an image (if necessary) and runs `pytesseract.image_to_string()`.
* **`_parse_amount(text)` / `_parse_date(text)` / `_parse_vendor(text)`**: Internal helper functions that use specific Regular Expression (regex) patterns to hunt down the total cost, the invoice date, and the company name from the messy raw text block.

#### `risk_engine.py`
* **`class RiskEngine`**: Custom scikit-learn style transformer.
* **`fit(anomaly_scores)`**: Takes millions of raw anomaly scores during training and calculates exact percentile cutoffs (e.g., what score constitutes the top 1%?).
* **`transform(score)`**: Takes a new prediction, compares it to the calculated percentiles, and returns a smooth 0-100 risk score.

#### `schemas.py`
* Contains pure Pydantic classes like `TransactionCreate`, `PredictionResult`, and `HealthResponse`. These don't have functional logic, but they strictly define the JSON schema boundaries for the API.

#### `train.py`
* **`class IsolationForestModel`**: Wrapper for `sklearn.ensemble.IsolationForest`.
* **`train(X)`**: Fits the decision trees to the feature data. Handles setting the `contamination` parameter.
* **`save_model(path)`**: Uses `joblib.dump()` to serialize the trained forest to the hard drive so it can be loaded instantly by the FastAPI backend.

---

### C. Frontend Architecture (`frontend/`)

#### Core Setup
* **`App.jsx`**: The React Router definition. It maps URLs (like `/upload` or `/explain`) to the specific Page components.
* **`main.jsx`**: The React root renderer that mounts the app to the `index.html` div.
* **`index.css`**: The Tailwind CSS engine. It defines CSS custom variables for the dark theme, configures `@theme`, and houses custom CSS `@keyframes` (like the pulsing red animations for critical alerts).

#### Pages (`frontend/src/pages/`)
* **`Dashboard.jsx`**: The homepage. Uses `useEffect` to fetch `/stats`. Renders Recharts components to show high-level KPIs, global anomaly trend graphs, and a dynamic risk score ring.
* **`UploadPage.jsx`**: A massive component managing the drag-and-drop state. It uses `useDropzone` (or custom drag events), maintains an array of files in `useState`, simulates progress bar advancement via `setTimeout` loops, and fires `axios.post` to `/batch-predict`.
* **`TransactionsPage.jsx`**: The heaviest data page. Maintains state for search text, risk filters, and pagination. It dynamically maps over transaction objects to render rows, and controls the open/close state of the `DetailDrawer.jsx`.
* **`ExplainabilityPage.jsx`**: Fetches the SHAP values from the backend. Normalizes the data to format it perfectly for the Recharts BarChart, rendering the visual waterfall of feature importance.
* **`AnalyticsPage.jsx`**: Purely visual page. Fetches aggregated ML performance metrics and renders ROC-AUC and Lift curves to prove model efficacy to business stakeholders.
* **`SettingsPage.jsx`**: A form state component. Allows users to type in new API URLs or toggle dark/light modes, saving these preferences to browser `localStorage`.
* **`LoginPage.jsx`**: Standard controlled form. Takes a username and password, hits the `/auth` endpoint, and stores the resulting JWT token in cookies/localStorage.

#### Components (`frontend/src/components/`)
* **`FilterBar.jsx`**: Contains search inputs and dropdown `select` elements. Emits `onChange` events back up to the `TransactionsPage` to update the data view.
* **`DetailDrawer.jsx`**: A slide-in panel (using Tailwind translate animations) that takes a single transaction ID as a prop and fetches deep details to render the mini SHAP chart and balance flow.
* **`ShapWaterfallChart.jsx`**: A customized Recharts component tailored specifically to color positive values red (risk increasing) and negative values green (risk decreasing).
* **`StatusBadge.jsx`**: A simple functional component that accepts a string (like "Critical") and returns a styled HTML `<span>` with the corresponding background and text colors.

---

### D. Research & Data (`notebooks/` & `saved_models/`)
* **`notebooks/eda_paysim.ipynb`**: The Jupyter notebook where initial data exploration happened. Contains pandas `.describe()`, missing value checks, and matplotlib histograms to understand the dataset shape.
* **`notebooks/day6_lof_comparison.ipynb`**: A critical research notebook comparing Isolation Forest to Local Outlier Factor (LOF). It contains the code that proves LOF's O(n²) complexity fails at scale, justifying the choice of Isolation Forest.
* **`saved_models/isolation_forest_v1.0.0.joblib` & `risk_engine_v1.0.0.joblib`**: The finalized, binary mathematical models loaded by the backend.

---

## 4. Problems Faced & How They Were Resolved

### Challenge 1: The Model Serialization Crash
* **Problem:** When trying to load the saved Machine Learning model into the backend server, the application crashed with an `AttributeError`. The model was accidentally saved as a Python dictionary instead of a raw scikit-learn object.
* **Resolution:** Modified the backend loading logic to properly extract the model from the dictionary using `model_data["model"]`. For the Risk Engine, completely reconstructed the object and re-saved it so the backend could call `.transform()` without issues.

### Challenge 2: SHAP Explanations Were Backwards
* **Problem:** The AI (Isolation Forest) outputs negative numbers for fraud and positive numbers for normal transactions. However, the Risk Engine requires positive numbers to mean "Higher Risk". Because of this mathematical inversion, the SHAP explanations were pointing in the wrong direction.
* **Resolution:** Implemented a "sign-flipping" mechanism in `explain.py`. By mathematically negating the scores before feeding them to the SHAP explainer, the visual waterfall charts correctly showed that "positive values" push the transaction toward being an anomaly.

### Challenge 3: Scale (O(n²) Complexity)
* **Problem:** Initially, tested an algorithm called Local Outlier Factor (LOF). However, LOF compares every transaction to every other transaction. On 6.3 million rows, it would take days to run.
* **Resolution:** Switched to **Isolation Forest**, which isolates anomalies using random decision trees. This reduced the time complexity from O(n²) to O(n log n), allowing the model to train on 6.3 million rows in just ~3 minutes.

### Challenge 4: Handling Single Rows vs. Batches
* **Problem:** The AI was trained on a specific set of 24 features. When the frontend sent a single transaction for real-time prediction, the data lacked certain columns (like historical rolling averages), causing the model to crash (`ValueError: feature names mismatch`).
* **Resolution:** Wrote an `align_features()` function in the FastAPI backend. It compares the incoming single row to the AI's expected columns and automatically fills missing data with zeros or averages, ensuring the AI never crashes on real-time requests.

### Challenge 5: Frontend CORS Blocks
* **Problem:** The React frontend (running on port 5173) was blocked from talking to the Python backend (running on port 8000) due to browser security rules (CORS).
* **Resolution:** Implemented `CORSMiddleware` in `backend/main.py`, explicitly allowing requests from the frontend origin, ensuring seamless communication.

---

## 5. Interview Talking Points (The 90-Second Pitch)

> "I built LedgerWatch AI from scratch to solve a real-world financial problem: detecting fraud without relying on millions of pre-labeled examples. 
> 
> I built a full pipeline that ingests transactions and invoices (using OCR). I engineered 24 custom features—like checking if a transaction zeroed out a balance—and trained an unsupervised Isolation Forest on 6.3 million transactions. Because business users need to understand AI decisions, I integrated SHAP to explain exactly why a transaction was flagged, and calibrated the raw math into an intuitive 0-100 risk score.
> 
> I wrapped this entire ML pipeline in a FastAPI backend with 5 REST endpoints, and built a beautiful, production-grade React dashboard using Tailwind CSS to visualize everything. It’s a complete end-to-end product: data engineering, machine learning, backend architecture, and frontend UI."
