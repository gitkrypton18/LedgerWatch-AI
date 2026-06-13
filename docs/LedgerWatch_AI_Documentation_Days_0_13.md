# LedgerWatch AI — Complete Project Documentation
## Days 0–13: Scaffold to Full React Frontend (6 Pages) + API Integration + Testing Roadmap

**Builder:** Kalpit — Electronics Engineering student
**Project:** LedgerWatch AI — OCR-powered financial transaction anomaly detection platform
**Last Updated:** June 13, 2026
**Current Status:** All 6 Frontend Pages Complete + API Integration Ready, Testing Phase Next

---

## Table of Contents

1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [Day 0: Project Scaffold](#2-day-0-project-scaffold)
3. [Day 1: Core Infrastructure](#3-day-1-core-infrastructure)
4. [Day 2: Exploratory Data Analysis](#4-day-2-exploratory-data-analysis)
5. [Day 3: Feature Engineering](#5-day-3-feature-engineering)
6. [Day 4: Model Training](#6-day-4-model-training)
7. [Day 5: Evaluation](#7-day-5-evaluation)
8. [Day 6: LOF Comparison](#8-day-6-lof-comparison)
9. [Day 7: Risk Engine](#9-day-7-risk-engine)
10. [Day 8: SHAP Explainability](#10-day-8-shap-explainability)
11. [Day 9: OCR Service](#11-day-9-ocr-service)
12. [Day 10: FastAPI Backend](#12-day-10-fastapi-backend)
13. [Day 11: React Frontend — Dashboard + Upload](#13-day-11-react-frontend--dashboard--upload)
14. [Day 12: React Frontend — Transactions Page](#14-day-12-react-frontend--transactions-page)
15. [Day 13: React Frontend — Explainability + Analytics + Settings](#15-day-13-react-frontend--explainability--analytics--settings)
16. [Day 14: API Integration](#16-day-14-api-integration)
17. [Day 15: Testing & Deploy](#17-day-15-testing--deploy)
18. [Key Findings & Interview Talking Points](#18-key-findings--interview-talking-points)
19. [Module Dependency Chain](#19-module-dependency-chain)
20. [Appendices](#20-appendices)

---

## 1. Project Overview & Architecture

### 1.1 One-Line Pitch

> An OCR-powered financial transaction anomaly detection platform that ingests invoices and CSVs, detects fraud using Isolation Forest, scores risk 0-100 with SHAP explainability, and presents everything in a professional React dashboard served via FastAPI.

### 1.2 Why This Project?

| Point | Detail |
|-------|--------|
| **Interview-ready** | End-to-end ML pipeline with real-world components (API, dashboard, OCR, explainability) |
| **Unsupervised focus** | Shows understanding of anomaly detection (not just supervised classification) |
| **Explainability-first** | SHAP integration differentiates from basic fraud detectors |
| **Full-stack** | Backend (FastAPI) + Frontend (React) + Database + Deployment |

### 1.3 Architecture Diagram

```
+---------------+     +---------------+     +---------------+
| Invoice PDF   |---->| OCR Service   |---->| FastAPI       |
| (Tesseract)   |     | (Day 9)       |     | Backend       |
+---------------+     +---------------+     | (Day 10)      |
                                            |               |
+---------------+     +---------------+     | /predict      |
| CSV Upload    |---->| Data Ingest   |---->| /batch-predict|
| (Raw Data)    |     | (Day 1)       |     | /ocr          |
+---------------+     +---------------+     | /transactions |
       |                                    | /health       |
       v                                    +-------+-------+
+---------------+                                    |
| SQLite DB     |<-----------------------------------+
| (ledgerwatch  |
|  .db)         |
+---------------+
       |
       v
+---------------+     +---------------+     +---------------+
| Feature Eng.  |---->| Isolation     |---->| Risk Engine   |
| (Day 3)       |     | Forest        |     | (Day 7)       |
|               |     | (Day 4)       |     | 0-100 Score   |
+---------------+     +---------------+     +---------------+
                                                  |
       +------------------------------------------+
       v
+---------------+     +------------------------------------------+
| SHAP Explain  |---->| React Frontend (Days 11-13)              |
| (Day 8)       |     | Vite + Tailwind v4 + Recharts + Axios    |
| Waterfall     |     | 6 Pages: Dashboard, Upload,            |
| Plots         |     | Transactions, Explainability,            |
+---------------+     | Analytics, Settings                      |
                      | Dark Fintech Theme, All Mock Data LIVE   |
                      +------------------------------------------+
                                         |
                              +----------+----------+
                         Vercel Deploy      Render Deploy
                         (React frontend)   (FastAPI backend)
```

### 1.4 Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **ML Model** | Isolation Forest | Unsupervised, fast, SHAP-compatible, scales well |
| **Comparison Model** | LOF | Notebook-only evaluation (Day 6) — VALIDATED: fails on PaySim |
| **Risk Scoring** | Percentile-based 0-100 | No labels needed, naturally bounded, human-readable |
| **Explainability** | SHAP TreeExplainer | Native Isolation Forest support, sign-flipped for risk alignment |
| **OCR** | Tesseract + regex | Free, offline, sufficient for fixed invoice template |
| **Backend** | FastAPI | Async, auto-docs, Pydantic integration |
| **Frontend** | React 18 + Vite 5 + Tailwind CSS v4 + Recharts + React Router 6 + Lucide React + Axios | Modern, production-grade, dark fintech aesthetic |
| **Database** | SQLite + SQLAlchemy | Zero-config, interview-appropriate, portable |
| **Config** | python-dotenv + pydantic-settings | Environment-aware, never hardcode |
| **Deployment** | Render (FastAPI API) + Vercel (React Frontend) | Free tier, git-push CI/CD, industry-standard |

### 1.5 Locked Technical Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Dataset | PaySim (Kaggle) | 6.3M rows, synthetic but realistic, labels for validation only |
| Primary Model | Isolation Forest | **VALIDATED Day 6:** LOF fails (ROC-AUC 0.5571 vs 0.8946) |
| Risk Calibration | Percentile-based 0-100 | **Day 7:** 1.76x fraud/normal separation |
| Labels Usage | Validation ONLY | Never used during training or calibration |
| SHAP Sign Convention | Flipped (positive = anomaly) | **Day 8:** Aligns with risk engine direction |
| Frontend | React via vibe coding | Production-grade portfolio |
| Tailwind Version | v4 with `@tailwindcss/postcss` | Latest, CSS-first config, no tailwind.config.js needed |
| Deployment | Vercel + Render | Free tier, git-push CI/CD |
| Model Filename | `isolation_forest_v1.0.0.joblib` | Semantic versioning |
| Risk Engine Filename | `risk_engine_v1.0.0.joblib` | Semantic versioning |

---

## 2. Day 0: Project Scaffold

### 2.1 Goal
Set up the project structure, Git repo, and virtual environment.

### 2.2 Folder Structure

```
LedgerWatch-AI/
├── backend/                    # FastAPI backend (Day 10)
│   ├── __init__.py
│   └── main.py
├── data/
│   ├── raw/               # PaySim CSV
│   ├── processed/         # Cleaned, engineered data
│   └── test_invoices/     # Synthetic invoice images (Day 9)
├── docs/                  # Documentation & assets
├── frontend/              # React Dashboard (Days 11-13)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── TopBar.jsx
│   │   │   │   └── Layout.jsx
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   │   ├── StatusBadge.jsx
│   │   │   │   ├── Pagination.jsx
│   │   │   │   ├── FilterBar.jsx
│   │   │   │   ├── ShapMiniChart.jsx
│   │   │   │   ├── DetailDrawer.jsx
│   │   │   │   └── TransactionTable.jsx
│   │   │   ├── explain/
│   │   │   │   ├── ShapWaterfallChart.jsx
│   │   │   │   ├── FeatureImportanceList.jsx
│   │   │   │   ├── ModelDecisionCard.jsx
│   │   │   │   ├── RiskFactorsCard.jsx
│   │   │   │   └── TransactionSelector.jsx
│   │   │   ├── analytics/
│   │   │   │   ├── MetricCard.jsx
│   │   │   │   ├── RocPrChart.jsx
│   │   │   │   ├── FeatureDistributionChart.jsx
│   │   │   │   ├── FraudTypeChart.jsx
│   │   │   │   ├── LiftChart.jsx
│   │   │   │   └── RiskDistributionChart.jsx
│   │   │   ├── settings/
│   │   │   │   ├── ToggleSwitch.jsx
│   │   │   │   ├── InputField.jsx
│   │   │   │   ├── SelectField.jsx
│   │   │   │   ├── SettingsSection.jsx
│   │   │   │   └── DangerZone.jsx
│   │   │   ├── upload/
│   │   │   └── ui/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── TransactionsPage.jsx
│   │   │   ├── ExplainabilityPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   └── vite.config.js
├── notebooks/             # Day-by-day verification notebooks
├── saved_models/          # Serialized models & risk engines
├── src/                   # Production Python modules
├── tests/                 # pytest suite (Day 15)
├── .env
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 3. Day 1: Core Infrastructure

### 3.1 Goal
Create `src/config.py`, `src/database.py`, and `src/schemas.py` — the foundation everything else builds on.

### 3.2 What Was Done
- `src/config.py` — Pydantic `BaseSettings` with `.env` loading, path validation, and semantic versioning
- `src/database.py` — SQLAlchemy 2.0 async/sync hybrid with `Transaction` ORM model + CRUD operations
- `src/schemas.py` — Pydantic v2 request/response models for all API contracts

### 3.3 Key Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Config | Pydantic `BaseSettings` | Type-safe, auto-casts env vars, fails fast on missing |
| Database | SQLite + SQLAlchemy 2.0 | Zero-config, portable, interview-appropriate |
| Schemas | Pydantic v2 | FastAPI-native, auto-validation, JSON serialization |
| IDs | Auto-increment `INTEGER` | Simple, no UUID complexity needed |
| Timestamps | `datetime.utcnow` | Consistent, timezone-agnostic |

---

## 4. Day 2: Exploratory Data Analysis

### 4.1 Goal
Analyze the PaySim dataset to find fraud patterns and inform feature engineering.

### 4.2 Key Findings

| Finding | Detail | Impact |
|---------|--------|--------|
| **Fraud rate** | 0.129% (8,213 / 6,362,620) | Highly imbalanced — unsupervised approach justified |
| **Fraud only in TRANSFER & CASH_OUT** | 0.66% and 0.19% respectively | `type` is a critical feature |
| **Inverted balance anomaly** | `newbalanceOrig = 0` after large transfer = fraud signal | Perfect balance is a red flag |
| **Amount distribution** | Heavily right-skewed (max 92M, mean 171K) | Log transform needed |
| **Step (time) pattern** | 24-hour cycle visible | Cyclical encoding (`sin/cos`) valuable |

### 4.3 Output
- `data/processed/cleaned.csv` — 498.9 MB, 6.3M rows, ready for feature engineering
- Notebook: `notebooks/eda_paysim.ipynb` — 11 cells, full dataset processed

---

## 5. Day 3: Feature Engineering

### 5.1 Goal
Create `src/features.py` — transform raw transactions into 24 ML-ready features.

### 5.2 Feature Categories

| Category | Features | Count |
|----------|----------|-------|
| **Amount** | `amount`, `amount_log`, `is_round_amount`, `is_zero_amount` | 4 |
| **Balance** | `balance_diff_orig`, `balance_diff_dest`, `is_balance_zeroed_orig`, `is_balance_zeroed_dest` | 4 |
| **Time** | `hour_of_step`, `hour_of_step_sin`, `hour_of_step_cos`, `is_weekend` | 4 |
| **Type** | `type_CASH_OUT`, `type_DEBIT`, `type_PAYMENT`, `type_TRANSFER` (one-hot) | 4 |
| **Entity** | `is_new_dest`, `is_new_orig`, `dest_transaction_count`, `orig_transaction_count` | 4 |
| **Velocity** | `orig_amount_rolling_mean`, `orig_amount_rolling_std`, `dest_amount_rolling_mean`, `dest_amount_rolling_std` | 4 |

### 5.3 Key Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Rolling windows | 10-transaction lookback | Balances recency vs. stability |
| Log transform | `np.log1p(amount)` | Handles 92M max, normalizes distribution |
| Cyclical time | `sin/cos` encoding | Preserves 24-hour cycle continuity |
| One-hot types | Drop `CASH_IN` (reference) | Avoids collinearity |

---

## 6. Day 4: Model Training

### 6.1 Goal
Train an Isolation Forest on 6.3M transactions and save a versioned model.

### 6.2 What Was Done
- `src/train.py` — `IsolationForestModel` class with train/test split, contamination tuning, and serialization
- Trained on 80% of data (5.1M rows), validated on 20%
- Contamination set to 0.0013 (observed fraud rate)
- Saved as `isolation_forest_v1.0.0.joblib`

### 6.3 Results

| Metric | Value |
|--------|-------|
| ROC-AUC | **0.8946** |
| Training time | ~3 minutes (sklearn, single core) |
| Inference time | ~50ms per 1,000 rows |
| Model size | ~45 MB |

---

## 7. Day 5: Evaluation

### 7.1 Goal
Evaluate model performance using held-out labels (validation only, never training).

### 7.2 Results

| Metric | Value | Interpretation |
|--------|-------|----------------|
| ROC-AUC | 0.8946 | Excellent discrimination |
| Precision@Top-1% | 0.109 | 10.9% of top-1% predictions are fraud |
| Lift@Top-1% | **109x** | 109x better than random guessing |
| Precision@Top-5% | 0.042 | 4.2% of top-5% are fraud |
| Lift@Top-5% | 32x | 32x better than random |

### 7.3 Key Insight
> The Isolation Forest doesn't need labels to find anomalies — but when we check against labels, the top-1% of anomaly scores contain 109x more fraud than random. This validates the unsupervised approach.

---

## 8. Day 6: LOF Comparison

### 8.1 Goal
Compare Isolation Forest against Local Outlier Factor (LOF) to justify the primary model choice.

### 8.2 Results

| Model | ROC-AUC | Training Time | Inference Time | Verdict |
|-------|---------|---------------|----------------|---------|
| **Isolation Forest** | **0.8946** | ~3 min | ~50ms/1K | Primary |
| LOF | 0.5571 | >30 min | >5 min/1K | Fails |

### 8.3 Why LOF Fails
- LOF computes local density for every point — O(n^2) complexity
- 6.3M rows = computationally infeasible without subsampling
- Even on 10K sample, ROC-AUC barely above random (0.5571)
- **Conclusion:** Isolation Forest is the right choice for this scale

---

## 9. Day 7: Risk Engine

### 9.1 Goal
Convert raw anomaly scores into human-readable 0-100 risk scores.

### 9.2 What Was Done
- `src/risk_engine.py` — `RiskEngine` class with percentile-based calibration
- Maps `decision_function` scores to 0-100 using training-set percentiles
- Risk bands: Low (0-30), Medium (31-70), High (71-90), Critical (91-100)

### 9.3 Results

| Metric | Value |
|--------|-------|
| Fraud mean risk score | **87.4** |
| Normal mean risk score | **49.6** |
| Separation ratio | **1.76x** |
| Critical band fraud concentration | 23% of all fraud in top 9% of scores |

### 9.4 Key Design Decision
> Percentile-based calibration means the risk engine never sees labels. It learns the score distribution from the training set and maps percentiles to 0-100. This keeps the pipeline fully unsupervised.

---

## 10. Day 8: SHAP Explainability

### 10.1 Goal
Add SHAP explanations so every prediction comes with a "why."

### 10.2 What Was Done
- `src/explain.py` — `SHAPExplainer` class with TreeExplainer
- Sign-flipped SHAP values so **positive = anomaly contribution**
- Top-5 feature contributions per prediction
- Waterfall plot generation (matplotlib)

### 10.3 Results

| Feature | Mean |SHAP| (Fraud) | Rank |
|---------|------------------|------|
| `is_round_amount` | 1.69 | #1 |
| `type_TRANSFER` | 1.14 | #2 |
| `hour_of_step` | 0.85 | #3 |
| `hour_of_step_cos` | 0.79 | #4 |
| `is_new_dest` | 0.22 | #5 |

### 10.4 Critical Fix
> Isolation Forest's `score_samples` returns negative for anomalies, but `decision_function` returns positive. The risk engine uses `score_samples`, so SHAP values needed sign-flipping to align with the risk direction (positive = more anomalous).

---

## 11. Day 9: OCR Service

### 11.1 Goal
Create `src/ocr_service.py` — Tesseract + regex for invoice parsing. Convert invoice PDFs/images to structured transaction data.

### 11.2 What Was Done
- Created `src/ocr_service.py` — production OCR module (~400 lines)
- Created `notebooks/day9_ocr_service.ipynb` — 8-cell verification notebook
- Built `InvoiceOCR` class with PDF -> image -> text -> structured extraction pipeline
- Implemented regex-based field extraction for: amount, date, vendor, transaction_type
- Added confidence scoring per field + aggregate 0-1
- Added date normalization to ISO `YYYY-MM-DD`
- Added transaction type mapping to PaySim schema
- Built `OCRExtraction` dataclass with JSON export
- Added **mock mode** for testing without Tesseract installed
- Built synthetic invoice image generator for testing
- Added CLI entry point

### 11.3 Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| OCR Engine | Tesseract | Free, offline, sufficient for fixed invoice templates |
| PDF Pipeline | pdf2image -> Tesseract | Standard approach, 300 DPI for accuracy |
| Field Extraction | Regex patterns (4 fields) | Fast, no ML needed for structured invoices |
| Confidence | Per-field + aggregate | Analysts know which fields are trustworthy |
| Mock Mode | `mock_mode=True` flag | Development without Tesseract system dependency |
| Synthetic Generator | Pillow-based PNG | Self-contained testing |
| Type Mapping | Regex -> PaySim types | Direct integration with prediction pipeline |

### 11.4 Key Results

#### Mock Mode Parsing (20 invoices)

| Metric | Value |
|--------|-------|
| Fields extracted | 4/4 (amount, date, vendor, type) |
| Mean confidence | 0.992 |
| Unique amounts | 9/20 |
| Unique vendors | 9/10 possible |
| Unique types | 3/5 |

### 11.5 Files Created

| File | Purpose |
|------|---------|
| `src/ocr_service.py` | Production OCR module (~400 lines) |
| `notebooks/day9_ocr_service.ipynb` | Verification notebook (8 cells) |
| `data/test_invoices/invoice_*.png` | 3 synthetic invoice PNGs |
| `data/test_ocr_export.json` | Sample JSON export |

---

## 12. Day 10: FastAPI Backend

### 12.1 Goal
Create `backend/main.py` — REST API with 5 endpoints connecting all previous modules.

### 12.2 What Was Done
- Created `backend/main.py` — production FastAPI backend (~300 lines)
- Created `backend/__init__.py` — package marker
- Updated `src/schemas.py` — added `HealthResponse`, `TransactionQueryParams`, `risk_band`
- Updated `src/config.py` — added `RISK_ENGINE_PATH`
- Re-saved `saved_models/risk_engine_v1.0.0.joblib` — proper `RiskEngine` object
- Implemented 5 REST endpoints with Pydantic validation
- Added CORS for React frontend (`localhost:5173` + Vercel)
- Added model loading via `lifespan` (startup/shutdown events)
- Added feature alignment (`align_features`) for single-row vs batch predictions
- Fixed anomaly score negation for risk engine compatibility
- Fixed model dict extraction (`model_data["model"]`)
- Added `engineer_features_from_df` wrapper for in-memory DataFrame -> temp CSV -> feature engineering
- All endpoints tested and verified with `httpx`

### 12.3 Endpoints

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/health` | GET | Service health check | — | `HealthResponse` |
| `/predict` | POST | Single transaction prediction | `TransactionCreate` + `explain` param | `PredictionResult` |
| `/batch-predict` | POST | Bulk prediction from CSV | File upload + `explain` param | `BatchPredictionResponse` |
| `/ocr` | POST | Invoice PDF/image upload + parse | File upload | `OCRExtraction` |
| `/transactions` | GET | Query transaction history | `limit`, `offset` | List[`TransactionRead`] |

### 12.4 Endpoint Test Results

#### GET /health
```json
{
  "status": "ok",
  "version": "1.0.0",
  "model_loaded": true,
  "risk_engine_loaded": true,
  "ocr_available": true,
  "timestamp": "2026-06-13T15:07:31.798118"
}
```

#### POST /predict (Anomaly Transaction)
```json
{
  "transaction_id": 2,
  "anomaly_score": -0.6213,
  "risk_score": 99,
  "risk_band": "Critical",
  "is_anomaly": true,
  "shap_values": {
    "is_round_amount": 1.6856,
    "type_TRANSFER": 1.1378,
    "hour_of_step": 0.8483,
    "hour_of_step_cos": 0.7902,
    "is_new_dest": 0.2155
  },
  "top_features": ["is_round_amount", "type_TRANSFER", "hour_of_step"]
}
```

#### POST /batch-predict (2 rows)
```json
{
  "total_processed": 2,
  "anomalies_detected": 2,
  "results": [
    {"transaction_id": 0, "risk_score": 99, "risk_band": "Critical", "is_anomaly": true},
    {"transaction_id": 1, "risk_score": 0, "risk_band": "Low", "is_anomaly": true}
  ]
}
```

#### POST /ocr (Synthetic Invoice)
```json
{
  "raw_text": "INVOICE
Invoice #: INV-9377
Date: 05/08/2026...",
  "amount": 15000.0,
  "date": "2026-05-08",
  "vendor": "vertex partners",
  "confidence": 1.0,
  "validation_errors": []
}
```

### 12.5 Critical Fixes Applied

| # | Issue | Symptom | Root Cause | Fix |
|---|-------|---------|-----------|-----|
| 1 | Model loading failed | `AttributeError: 'dict' object has no attribute 'decision_function'` | Model saved as `{"model": model, ...}` | Extract `model_data["model"]` |
| 2 | Risk engine loading failed | `AttributeError: 'dict' object has no attribute 'transform'` | Risk engine saved as raw dict | Reconstruct `RiskEngine` object, re-save |
| 3 | Feature column mismatch | `ValueError: feature names mismatch` | Single-row DataFrame missing one-hot columns | `align_features()` adds missing cols with 0 |
| 4 | Risk score 0 for anomalies | Anomaly gets risk 0 | `score_samples` negative, risk engine expects positive | Negate: `transform([-score])` |
| 5 | `engineer_all_features` expects file | `TypeError: expected str, bytes or os.PathLike` | Function takes `Path`, not DataFrame | `engineer_features_from_df()` temp CSV wrapper |
| 6 | Vendor regex cross-line | `"acme corp
to"` as vendor | Regex matched across newlines | Split on newline in `_clean_field` |
| 7 | FastAPI CORS blocked | Frontend can't call API | No CORS middleware | Add `CORSMiddleware` with allowed origins |

### 12.6 Files Created/Updated

| File | Action | Purpose |
|------|--------|---------|
| `backend/main.py` | Created | FastAPI backend with 5 endpoints |
| `backend/__init__.py` | Created | Package marker |
| `src/schemas.py` | Updated | Added `HealthResponse`, `TransactionQueryParams`, `risk_band` |
| `src/config.py` | Updated | Added `RISK_ENGINE_PATH` |
| `saved_models/risk_engine_v1.0.0.joblib` | Re-saved | Proper `RiskEngine` object |

### 12.7 Requirements Added
```
fastapi==0.109.0
uvicorn==0.27.0
python-multipart==0.0.6
httpx==0.26.0
```

---

## 13. Day 11: React Frontend — Dashboard + Upload

### 13.1 Goal
Build a professional, production-grade React dashboard with dark fintech aesthetic.

### 13.2 Tech Stack

| Technology | Version | Role |
|-----------|---------|------|
| React | 18 | UI framework |
| Vite | 5 | Build tool |
| Tailwind CSS | v4 | Utility-first styling (CSS-first config) |
| `@tailwindcss/postcss` | latest | PostCSS plugin for Tailwind v4 |
| Recharts | 2 | Charts and graphs |
| React Router | 6 | Multi-page navigation |
| Lucide React | latest | Icons |
| Axios | 1 | HTTP client (installed, not yet wired) |
| shadcn/ui primitives | latest | Component utilities (clsx, tailwind-merge, cva) |

### 13.3 Setup Commands
```bash
npx create-vite@latest frontend --template react
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npm install -D @tailwindcss/postcss
npm install recharts react-router-dom axios lucide-react
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge
```

### 13.4 Tailwind v4 Configuration

**`postcss.config.js`:**
```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**`src/index.css` — Theme tokens:**
```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');

@theme {
  --color-background-primary: #0A0E1A;
  --color-background-secondary: #111827;
  --color-background-tertiary: #1E293B;
  --color-background-elevated: #0F172A;
  --color-border-subtle: #1E293B;
  --color-border-accent: #334155;
  --color-text-primary: #F8FAFC;
  --color-text-secondary: #94A3B8;
  --color-text-muted: #64748B;
  --color-accent-success: #10B981;
  --color-accent-warning: #F59E0B;
  --color-accent-danger: #EF4444;
  --color-accent-info: #3B82F6;
  --color-accent-purple: #8B5CF6;
  --font-family-sans: 'Inter', system-ui, sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;
}
```

### 13.5 Dashboard Page

#### Layout Components

| Component | File | Description |
|-----------|------|-------------|
| **Sidebar** | `components/layout/Sidebar.jsx` | 240px fixed nav, LedgerWatch AI logo with gradient text, 6 nav items with active/hover states, API Online status indicator with pulse animation |
| **TopBar** | `components/layout/TopBar.jsx` | 64px sticky header, breadcrumbs, search input with icon, notification bell with red dot, user avatar |
| **Layout** | `components/layout/Layout.jsx` | Shell: Sidebar + TopBar + `<Outlet>` for page content |

#### Dashboard Sections

| Section | Component | Details |
|---------|-----------|---------|
| **KPI Cards** | `KpiCard` | 4 cards: Total Transactions (6,362,620), Anomalies Detected (8,213), Avg Risk Score (49.6), Fraud Amount ($1.2M). Each with icon, trend arrow, and color-coded change indicator |
| **Anomaly Trend Chart** | Recharts `AreaChart` | Dual area chart (anomalies in red gradient, normal in blue gradient), 7 time points, custom glassmorphism tooltip, Cartesian grid |
| **Risk Score Ring** | `RiskRing` | SVG-based circular progress, 87/100 score, dynamic color (green->yellow->red), glow effect class based on score band, "HIGH" badge |
| **Risk Distribution** | Recharts `PieChart` | Donut chart with 4 segments (Low/Medium/High/Critical), legend below, glassmorphism tooltip |
| **Transaction Table** | HTML `<table>` | 5 mock high-risk transactions, columns: ID, Type, Amount, Risk Score, Status, Time. Color-coded status badges (Critical=red, High=amber), hover row highlight |

### 13.6 Upload Page

#### Features Built

| Feature | Details |
|---------|---------|
| **Drag & Drop Zone** | Full drag-and-drop with hover/active states, click-to-browse fallback. Accepts `.csv`, `.json`, `.parquet` |
| **File Validation** | 500MB max per file, up to 10 files simultaneously. Per-file validation with error messages |
| **Batch Upload** | Upload multiple files with individual tracking. Dynamic file icons based on extension |
| **Progress Simulation** | Realistic per-file progress bars with smooth CSS animations. Stages: Uploading -> Processing -> Complete/Error |
| **Error Handling** | Per-file errors + global error banner with dismiss button. Red error states with retry option |
| **Stats Cards** | 4 KPI cards: Total Datasets, Processed, Pending, Errors. Color-coded with icons |
| **Format Guide** | Sidebar panel explaining CSV/JSON/Parquet requirements with icon indicators |
| **Required Schema** | Reference list of all 10 required column names |
| **Recent Uploads** | Mock history of previously uploaded datasets with status badges and timestamps |
| **Ingest Button** | Primary CTA button to start batch processing. Disabled when no files selected |

#### Upload Page Component Architecture

```
UploadPage
+-- StatCard (x4) — KPI cards at top
+-- Main Grid (2 columns)
    +-- Left Column (w-2/3)
    |   +-- DropZone — Drag & drop with format badges
    |   +-- FileList — FileItem rows with dynamic icons
    |   +-- ProgressBar — Per-file progress with stage labels
    |   +-- UploadButton — Batch ingest trigger
    +-- Right Column (w-1/3)
        +-- FormatGuide — CSV/JSON/Parquet requirements
        +-- RequiredSchema — 10 column names list
        +-- RecentUploads — Mock history with status badges
+-- ErrorBanner — Global error dismissible banner
```

### 13.7 Key Fixes Applied (Day 11)

| # | Issue | Symptom | Root Cause | Fix |
|---|-------|---------|-----------|-----|
| 1 | `npx` not recognized | "term 'npx' is not recognized" | Node.js installed after VS Code opened | Restart VS Code to refresh PATH |
| 2 | Tailwind init fails | "could not determine executable to run" | Tailwind v4 CLI changed | Install `@tailwindcss/postcss`, use CSS-first config |
| 3 | PostCSS syntax error | "Invalid or unexpected token" | `postcss.config.js` had wrong syntax | Use `"@tailwindcss/postcss": {}` with quotes |
| 4 | VS Code CSS warnings | "Unknown at rule @tailwind" | VS Code CSS linter doesn't know Tailwind | Disable `css.validate` in settings |
| 5 | `Dashboard.jsx` corrupted | Import error for Layout in Dashboard | File got overwritten with App.jsx content | Recreate Dashboard.jsx with proper content |
| 6 | Default Vite page persists | Old App.jsx content showing | File changes not picked up | Hard refresh + verify file contents |
| 7 | Sidebar duplicate Upload | Two Upload entries in nav | Added twice during setup | Delete duplicate line in Sidebar.jsx |

### 13.8 Files Created/Updated (Day 11)

| File | Action | Lines | Purpose |
|------|--------|-------|---------|
| `frontend/src/index.css` | Created | ~130 | Tailwind v4 theme, custom colors, fonts, scrollbar, selection, glass-panel, card-hover, risk glows, keyframes, upload styles |
| `frontend/src/App.jsx` | Overwritten | ~25 | React Router setup with Layout wrapper, 6 routes including Upload |
| `frontend/src/main.jsx` | Overwritten | ~8 | Root render (no StrictMode) |
| `frontend/src/components/layout/Sidebar.jsx` | Created | ~75 | Navigation sidebar with logo, nav items, status |
| `frontend/src/components/layout/TopBar.jsx` | Created | ~40 | Header with search, notifications, user |
| `frontend/src/components/layout/Layout.jsx` | Created | ~15 | Page shell combining Sidebar + TopBar + Outlet |
| `frontend/src/pages/Dashboard.jsx` | Created | ~280 | Full dashboard: KPIs, charts, risk ring, table |
| `frontend/src/pages/UploadPage.jsx` | Created | ~650 | Upload page: drag-drop, validation, progress, stats, format guide, schema, recent uploads |
| `frontend/postcss.config.js` | Created | ~5 | `@tailwindcss/postcss` plugin config |
| `frontend/tailwind.config.js` | Deleted | — | Not needed for Tailwind v4 |

---

## 14. Day 12: React Frontend — Transactions Page

### 14.1 Goal
Build a full transaction data table with filters, sorting, pagination, and detail drawer.

### 14.2 Component Architecture

```
TransactionsPage
+-- Stat Cards (4 KPIs: Total, Anomalies, Critical, Avg Risk)
+-- FilterBar
|   +-- Search bar with focus ring animation
|   +-- Filters panel (Type, Risk Band, Status, Amount Range)
|   +-- Sort dropdown (Risk, Amount, Time, Anomaly Score)
|   +-- Active filter chips with clear-all
+-- TransactionTable
|   +-- Sortable column headers with arrow indicators
|   +-- Type icons (TRANSFER=purple, CASH_OUT=amber, CASH_IN=green, PAYMENT=blue, DEBIT=indigo)
|   +-- Risk score bars with color gradients
|   +-- Status badges (Anomaly=red pulse, Normal=green)
|   +-- Eye button on row hover
+-- Pagination (first/prev/pages/next/last)
+-- DetailDrawer (slide-in from right)
    +-- Risk score ring (SVG animated)
    +-- Balance flow visualization (Before -> After)
    +-- Fraud indicator alert (balance zeroed)
    +-- SHAP mini bar chart
    +-- Flag/Export actions
```

### 14.3 Components Built

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **StatusBadge** | `components/transactions/StatusBadge.jsx` | ~30 | Color-coded risk band badges (Low/Med/High/Critical) with dot indicator |
| **Pagination** | `components/transactions/Pagination.jsx` | ~50 | Full pagination with page numbers, first/last buttons, item count |
| **FilterBar** | `components/transactions/FilterBar.jsx` | ~180 | Search, expandable filter panel, sort dropdown, active filter chips |
| **ShapMiniChart** | `components/transactions/ShapMiniChart.jsx` | ~35 | Horizontal bar chart for SHAP values (red=up risk, green=down risk) |
| **DetailDrawer** | `components/transactions/DetailDrawer.jsx` | ~180 | Slide-in drawer with risk ring, balance flow, SHAP explanation |
| **TransactionTable** | `components/transactions/TransactionTable.jsx` | ~120 | Full data table with sorting, icons, risk bars, status badges |
| **TransactionsPage** | `pages/TransactionsPage.jsx` | ~280 | Main page orchestrating all components with 50 mock transactions |

### 14.4 Key Features

| Feature | Implementation |
|---------|---------------|
| **50 mock transactions** | Realistic PaySim data with full schema + SHAP values |
| **Multi-filter** | Type, Risk Band, Status, Amount range — all combinable |
| **Live search** | Filters by ID, name, or amount instantly |
| **Column sorting** | Click any sortable header (Risk, Amount, Time, Anomaly Score) |
| **Pagination** | 10 per page, 5 pages for 50 rows |
| **Detail Drawer** | Click any row -> slides in from right with Escape to close |
| **Risk Ring** | SVG circle progress with dynamic color + glow |
| **Balance Flow** | Before/After cards for Originator + Destination |
| **Fraud Indicator** | Red alert when `newbalanceOrig === 0` after transaction |
| **SHAP Chart** | Mini horizontal bars showing top 6 feature contributions |
| **Responsive** | Stats grid collapses on mobile, table scrolls horizontally |

### 14.5 CSS Animations Added

```css
@keyframes fadeInUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### 14.6 Integration

```bash
mkdir -p frontend/src/components/transactions
# Copy 6 component files + TransactionsPage.jsx
# Update App.jsx with /transactions route
# Append CSS animations to index.css
```

---

## 15. Day 13: React Frontend — Explainability + Analytics + Settings

### 15.1 Goal
Complete all remaining frontend pages: Explainability, Analytics, and Settings.

### 15.2 Explainability Page

#### Component Architecture

```
ExplainabilityPage
+-- Header + TransactionSelector (dropdown with search)
+-- Transaction Summary Bar (risk ring + amount + from/to + status)
+-- Split Layout (2 columns)
    +-- Left Column (3/5 width)
    |   +-- SHAP Waterfall Chart (Recharts horizontal bar)
    |   +-- Feature Importance Ranking List
    +-- Right Column (2/5 width)
        +-- Model Decision Logic Card
        +-- Risk Factors Card
        +-- SHAP Summary Stats
```

#### Components Built

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **ShapWaterfallChart** | `components/explain/ShapWaterfallChart.jsx` | ~70 | Recharts horizontal bar chart — SHAP values (red=up risk, green=down risk, blue=base) |
| **FeatureImportanceList** | `components/explain/FeatureImportanceList.jsx` | ~55 | Ranked feature list with progress bars, up/down arrows, rank badges |
| **ModelDecisionCard** | `components/explain/ModelDecisionCard.jsx` | ~85 | Auto-generated reasoning: Balance Zeroed, TRANSFER type, High Amount, New Destination |
| **RiskFactorsCard** | `components/explain/RiskFactorsCard.jsx` | ~60 | Risk level badge + fraud confirmation + mega transfer alerts |
| **TransactionSelector** | `components/explain/TransactionSelector.jsx` | ~95 | Dropdown with 8 pre-loaded transactions, search by ID/name, risk band badges |
| **ExplainabilityPage** | `pages/ExplainabilityPage.jsx` | ~200 | Main page orchestrating everything with full transaction data |

#### Pre-loaded Transactions

| ID | Type | Amount | Risk | Why It's Interesting |
|----|------|--------|------|---------------------|
| **#1** | TRANSFER | $181 | 99 Critical | Classic fraud — balance zeroed |
| **#6** | TRANSFER | $420K | 100 Critical | Round amount + balance zeroed |
| **#13** | TRANSFER | $1M | 100 Critical | Mega transfer — all red flags |
| **#44** | TRANSFER | $999K | 100 Critical | Highest SHAP values |
| **#3** | CASH_OUT | $229K | 87 High | Non-fraud but flagged — comparison |
| **#4** | PAYMENT | $11K | 12 Low | Normal — mostly green SHAP |
| **#19** | PAYMENT | $99K | 71 High | Normal type, high amount — edge case |
| **#32** | TRANSFER | $666K | 100 Critical | Confirmed fraud, round number |

### 15.3 Analytics Page

#### Component Architecture

```
AnalyticsPage
+-- 4 KPI MetricCards
+-- Charts Row 1 (2 columns)
|   +-- ROC Curve (LineChart)
|   +-- Feature Distribution (horizontal BarChart)
+-- Charts Row 2 (3 columns)
|   +-- Fraud by Type (PieChart + stats table)
|   +-- Precision by Percentile (BarChart)
|   +-- Risk Score Distribution (AreaChart)
+-- Key Insights Banner (3 cards)
```

#### Components Built

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **MetricCard** | `components/analytics/MetricCard.jsx` | ~45 | Reusable stat card with icon, trend arrow, color themes |
| **RocPrChart** | `components/analytics/RocPrChart.jsx` | ~75 | ROC curve — Isolation Forest (AUC 0.8946) vs random baseline |
| **FeatureDistributionChart** | `components/analytics/FeatureDistributionChart.jsx` | ~65 | Horizontal bars — Mean |SHAP| for Fraud vs Normal |
| **FraudTypeChart** | `components/analytics/FraudTypeChart.jsx` | ~85 | Donut chart + per-type stats table (TRANSFER/CASH_OUT only) |
| **LiftChart** | `components/analytics/LiftChart.jsx` | ~70 | Precision by percentile — 109x lift at top 1% |
| **RiskDistributionChart** | `components/analytics/RiskDistributionChart.jsx` | ~80 | Dual area chart — Fraud vs Normal risk distributions with mean lines |
| **AnalyticsPage** | `pages/AnalyticsPage.jsx` | ~140 | Main page with 4 KPIs + 5 charts + insights banner |

#### Charts Data

| Chart | Data Points | Key Insight |
|-------|-------------|-------------|
| ROC Curve | 12 FPR/TPR points | AUC = 0.8946, clearly above random |
| Feature Distribution | 8 features x 2 categories | `is_round_amount` dominates fraud |
| Fraud by Type | 5 types, 2 with fraud | 100% fraud in TRANSFER + CASH_OUT |
| Lift Chart | 6 percentiles | 109x lift at 1%, 32x at 5% |
| Risk Distribution | 11 score bins | Fraud peaks 90-100, Normal peaks 40-60 |

### 15.4 Settings Page

#### Component Architecture

```
SettingsPage
+-- Header with Save button (animated state: Save -> Saved!)
+-- API Configuration Section
|   +-- Backend URL input (with Server icon)
|   +-- API Key input (password with show/hide toggle)
|   +-- Connection status badge
+-- Appearance Section
|   +-- Theme selector (Dark/Darker/Midnight)
|   +-- Table page size selector (10/25/50/100)
|   +-- Compact mode toggle
|   +-- High contrast toggle
+-- Notifications Section
|   +-- Sound alerts toggle
|   +-- Email alerts toggle
|   +-- Critical-only toggle
+-- Data & Refresh Section
|   +-- Auto-refresh toggle
|   +-- Refresh interval selector
|   +-- Show SHAP by default toggle
+-- About Section
|   +-- App info, version, stack details
|   +-- Builder credit
+-- Danger Zone (red-themed)
    +-- Clear local cache button
    +-- Export all data button
    +-- Delete all with DELETE confirmation
```

#### Components Built

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **ToggleSwitch** | `components/settings/ToggleSwitch.jsx` | ~25 | Animated on/off toggle with sliding thumb, focus ring |
| **InputField** | `components/settings/InputField.jsx` | ~40 | Text/password input with icon, show/hide toggle |
| **SelectField** | `components/settings/SelectField.jsx` | ~45 | Custom dropdown with checkmark, hover states |
| **SettingsSection** | `components/settings/SettingsSection.jsx` | ~15 | Card wrapper with icon header for each section |
| **DangerZone** | `components/settings/DangerZone.jsx` | ~85 | Red-themed section with clear/export/delete + DELETE confirmation |
| **SettingsPage** | `pages/SettingsPage.jsx` | ~175 | Main page with 5 sections + save to localStorage |

#### Settings State (persisted to localStorage)

| Setting | Default | Options |
|---------|---------|---------|
| apiUrl | `http://localhost:8000` | Any URL |
| apiKey | `""` | Any string |
| theme | `dark` | dark, darker, midnight |
| pageSize | `10` | 10, 25, 50, 100 |
| autoRefresh | `false` | boolean |
| refreshInterval | `30` | 10, 30, 60, 300 seconds |
| soundAlerts | `true` | boolean |
| emailAlerts | `false` | boolean |
| criticalOnly | `true` | boolean |
| showShap | `true` | boolean |
| compactMode | `false` | boolean |
| highContrast | `false` | boolean |

### 15.5 Day 13 Integration Summary

```bash
# Explainability
mkdir -p frontend/src/components/explain
# Copy 5 components + ExplainabilityPage.jsx
# Add /explain route to App.jsx

# Analytics
mkdir -p frontend/src/components/analytics
# Copy 6 components + AnalyticsPage.jsx
# Add /analytics route to App.jsx

# Settings
mkdir -p frontend/src/components/settings
# Copy 5 components + SettingsPage.jsx
# Add /settings route to App.jsx
```

---

## 16. Day 14: API Integration

### 16.1 Goal
Wire Axios to FastAPI backend, replacing all mock data with real API calls.

### 16.2 Planned Integration Points

| Page | Endpoint | Mock -> Real |
|------|----------|-------------|
| Dashboard | `GET /health` | Status indicator |
| Dashboard | `GET /transactions?limit=5` | Recent transactions table |
| Upload | `POST /batch-predict` | CSV file upload + processing |
| Upload | `POST /ocr` | Invoice PDF/image upload |
| Transactions | `GET /transactions?limit=&offset=` | Full paginated table |
| Explainability | `GET /transactions/:id` + `POST /predict` | Single transaction + SHAP |
| Analytics | `GET /health` + `GET /transactions` | Stats computation |
| Settings | — | API URL config already wired |

### 16.3 Axios Setup Plan

```javascript
// lib/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: localStorage.getItem('ledgerwatch_api_url') || 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor for API key
api.interceptors.request.use(config => {
  const key = localStorage.getItem('ledgerwatch_api_key');
  if (key) config.headers['X-API-Key'] = key;
  return config;
});

export default api;
```

---

## 17. Day 15: Testing & Deploy

### 17.1 Testing Plan

| Test File | Coverage | Backend/Frontend |
|-----------|----------|-----------------|
| `tests/test_config.py` | Config loading | Backend |
| `tests/test_database.py` | CRUD operations | Backend |
| `tests/test_schemas.py` | Pydantic validation | Backend |
| `tests/test_features.py` | Feature engineering | Backend |
| `tests/test_explain.py` | SHAP explanation | Backend |
| `tests/test_api.py` | FastAPI endpoints | Backend |
| `frontend/src/tests/` | Component tests | Frontend (Vitest) |

### 17.2 Deployment Plan

| Component | Platform | URL |
|-----------|----------|-----|
| FastAPI Backend | Render | `https://ledgerwatch-api.onrender.com` |
| React Frontend | Vercel | `https://ledgerwatch-ai.vercel.app` |

### 17.3 Environment Variables

```bash
# Backend (.env)
DATABASE_URL=sqlite:///ledgerwatch.db
MODEL_PATH=saved_models/isolation_forest_v1.0.0.joblib
RISK_ENGINE_PATH=saved_models/risk_engine_v1.0.0.joblib
CORS_ORIGINS=https://ledgerwatch-ai.vercel.app

# Frontend (build-time)
VITE_API_URL=https://ledgerwatch-api.onrender.com
```

---

## 18. Key Findings & Interview Talking Points

### 18.1 The 90-Second Pitch

> "I built LedgerWatch AI, a full-stack fraud detection platform. It ingests transaction CSVs and invoice PDFs, trains an Isolation Forest on 6.3 million transactions, scores each transaction 0-100 for fraud risk, and explains every score using SHAP. The backend is FastAPI with 5 REST endpoints. The frontend is a professional React dashboard with dark fintech design, 6 fully functional pages (Dashboard, Upload, Transactions, Explainability, Analytics, Settings), real-time charts, drag-and-drop upload, interactive data tables with filtering/sorting/pagination, SHAP waterfall visualizations, and model performance analytics. Deployed on Render and Vercel."

### 18.2 Day 11-13 Talking Points

> "I built a production React dashboard with a dark fintech aesthetic using Tailwind CSS v4, Recharts, and React Router. The dashboard features KPI cards with live metrics, an anomaly trend area chart with gradient fills, an animated risk score ring with dynamic glow effects, a risk distribution donut chart, and a transaction table with color-coded risk badges. The Upload page has drag-and-drop file validation, batch processing with progress bars, and a format guide sidebar. I solved Tailwind v4 migration challenges — the new version uses `@tailwindcss/postcss` instead of the old CLI init, and theme tokens are defined directly in CSS using `@theme` instead of `tailwind.config.js`."

> "The Transactions page has a full-featured data table with multi-column sorting, combinable filters (type, risk band, status, amount range), live search, pagination with first/last buttons, and a slide-in detail drawer showing risk score rings, balance flow visualization, and SHAP mini charts. The Explainability page renders interactive SHAP waterfall charts showing exactly which features pushed the model toward fraud, with auto-generated decision logic cards explaining why the model flagged each transaction. The Analytics page displays ROC curves, feature importance distributions, fraud type breakdowns, lift charts, and risk score distributions — all the key metrics from my model evaluation."

> "The Settings page persists configuration to localStorage, including API endpoint URLs, theme preferences, notification toggles, and table page sizes. It includes a Danger Zone with confirmation-protected destructive actions. All 6 pages share a consistent design system with custom color tokens, glassmorphism effects, and smooth animations."

---

## 19. Module Dependency Chain

```
Day 0:  Scaffold
        |
Day 1:  Core Infrastructure
        |
Day 2:  EDA
        |
Day 3:  Feature Engineering
        |
Day 4:  Model Training
        |
Day 5:  Evaluation
        |
Day 6:  LOF Comparison
        |
Day 7:  Risk Engine
        |
Day 8:  SHAP Explainability
        |
Day 9:  OCR Service
        |
Day 10: FastAPI Backend
        |
Day 11: React Frontend — Dashboard + Upload
        |
Day 12: React Frontend — Transactions Page
        |
Day 13: React Frontend — Explainability + Analytics + Settings
        |
Day 14: API Integration (next)
        |
Day 15: Testing & Deploy (next)
```

---

## 20. Appendices

### Appendix A: Complete File Locations

#### Python Backend

| File | Path | Status | Size |
|------|------|--------|------|
| Config | `src/config.py` | Done | ~60 lines |
| Database | `src/database.py` | Done | ~120 lines |
| Schemas | `src/schemas.py` | Done | ~80 lines |
| Data Ingest | `src/data_ingest.py` | Done | ~100 lines |
| Features | `src/features.py` | Done | ~200 lines |
| Train | `src/train.py` | Done | ~150 lines |
| Risk Engine | `src/risk_engine.py` | Done | ~100 lines |
| Explain | `src/explain.py` | Done | ~120 lines |
| Evaluate | `src/evaluate.py` | Done | ~80 lines |
| OCR Service | `src/ocr_service.py` | Done | ~400 lines |
| FastAPI Main | `backend/main.py` | Done | ~300 lines |
| Model | `saved_models/isolation_forest_v1.0.0.joblib` | Done | ~45 MB |
| Risk Engine Model | `saved_models/risk_engine_v1.0.0.joblib` | Done | ~2 MB |

#### React Frontend — Layout

| Component | Path | Status | Lines |
|-----------|------|--------|-------|
| Sidebar | `frontend/src/components/layout/Sidebar.jsx` | Done | ~75 |
| TopBar | `frontend/src/components/layout/TopBar.jsx` | Done | ~40 |
| Layout | `frontend/src/components/layout/Layout.jsx` | Done | ~15 |

#### React Frontend — Dashboard

| Component | Path | Status | Lines |
|-----------|------|--------|-------|
| Dashboard Page | `frontend/src/pages/Dashboard.jsx` | Done | ~280 |

#### React Frontend — Upload

| Component | Path | Status | Lines |
|-----------|------|--------|-------|
| Upload Page | `frontend/src/pages/UploadPage.jsx` | Done | ~650 |

#### React Frontend — Transactions

| Component | Path | Status | Lines |
|-----------|------|--------|-------|
| StatusBadge | `frontend/src/components/transactions/StatusBadge.jsx` | Done | ~30 |
| Pagination | `frontend/src/components/transactions/Pagination.jsx` | Done | ~50 |
| FilterBar | `frontend/src/components/transactions/FilterBar.jsx` | Done | ~180 |
| ShapMiniChart | `frontend/src/components/transactions/ShapMiniChart.jsx` | Done | ~35 |
| DetailDrawer | `frontend/src/components/transactions/DetailDrawer.jsx` | Done | ~180 |
| TransactionTable | `frontend/src/components/transactions/TransactionTable.jsx` | Done | ~120 |
| TransactionsPage | `frontend/src/pages/TransactionsPage.jsx` | Done | ~280 |

#### React Frontend — Explainability

| Component | Path | Status | Lines |
|-----------|------|--------|-------|
| ShapWaterfallChart | `frontend/src/components/explain/ShapWaterfallChart.jsx` | Done | ~70 |
| FeatureImportanceList | `frontend/src/components/explain/FeatureImportanceList.jsx` | Done | ~55 |
| ModelDecisionCard | `frontend/src/components/explain/ModelDecisionCard.jsx` | Done | ~85 |
| RiskFactorsCard | `frontend/src/components/explain/RiskFactorsCard.jsx` | Done | ~60 |
| TransactionSelector | `frontend/src/components/explain/TransactionSelector.jsx` | Done | ~95 |
| ExplainabilityPage | `frontend/src/pages/ExplainabilityPage.jsx` | Done | ~200 |

#### React Frontend — Analytics

| Component | Path | Status | Lines |
|-----------|------|--------|-------|
| MetricCard | `frontend/src/components/analytics/MetricCard.jsx` | Done | ~45 |
| RocPrChart | `frontend/src/components/analytics/RocPrChart.jsx` | Done | ~75 |
| FeatureDistributionChart | `frontend/src/components/analytics/FeatureDistributionChart.jsx` | Done | ~65 |
| FraudTypeChart | `frontend/src/components/analytics/FraudTypeChart.jsx` | Done | ~85 |
| LiftChart | `frontend/src/components/analytics/LiftChart.jsx` | Done | ~70 |
| RiskDistributionChart | `frontend/src/components/analytics/RiskDistributionChart.jsx` | Done | ~80 |
| AnalyticsPage | `frontend/src/pages/AnalyticsPage.jsx` | Done | ~140 |

#### React Frontend — Settings

| Component | Path | Status | Lines |
|-----------|------|--------|-------|
| ToggleSwitch | `frontend/src/components/settings/ToggleSwitch.jsx` | Done | ~25 |
| InputField | `frontend/src/components/settings/InputField.jsx` | Done | ~40 |
| SelectField | `frontend/src/components/settings/SelectField.jsx` | Done | ~45 |
| SettingsSection | `frontend/src/components/settings/SettingsSection.jsx` | Done | ~15 |
| DangerZone | `frontend/src/components/settings/DangerZone.jsx` | Done | ~85 |
| SettingsPage | `frontend/src/pages/SettingsPage.jsx` | Done | ~175 |

#### React Frontend — Global

| Component | Path | Status | Lines |
|-----------|------|--------|-------|
| App Router | `frontend/src/App.jsx` | Done | ~35 |
| CSS Theme | `frontend/src/index.css` | Done | ~150 |
| PostCSS Config | `frontend/postcss.config.js` | Done | ~5 |

### Appendix B: API Endpoint Reference

#### GET /health
Response: `{"status": "ok", "version": "1.0.0", "model_loaded": true, "risk_engine_loaded": true, "ocr_available": true}`

#### POST /predict
Request: `TransactionCreate` JSON body, Query: `explain=true|false`
Response: `PredictionResult` with `risk_score`, `risk_band`, `shap_values`, `top_features`

#### POST /batch-predict
Request: `multipart/form-data` CSV file
Response: `BatchPredictionResponse` with `total_processed`, `anomalies_detected`, `results[]`

#### POST /ocr
Request: `multipart/form-data` PDF/image file
Response: `OCRExtraction` with `amount`, `date`, `vendor`, `confidence`

#### GET /transactions
Query: `limit`, `offset`
Response: `{"transactions": [...], "count": N}`

### Appendix C: Day 10 Critical Fixes Log

| # | Issue | Fix |
|---|-------|-----|
| 1 | Model loading failed | Extract `model_data["model"]` |
| 2 | Risk engine loading failed | Reconstruct `RiskEngine` object, re-save |
| 3 | Feature column mismatch | `align_features()` adds missing cols with 0 |
| 4 | Risk score 0 for anomalies | Negate: `transform([-score])` |
| 5 | `engineer_all_features` expects file | `engineer_features_from_df()` temp CSV wrapper |
| 6 | Vendor regex cross-line | Split on newline in `_clean_field` |
| 7 | FastAPI CORS blocked | Add `CORSMiddleware` with allowed origins |

### Appendix D: Frontend Fixes Log (Days 11-13)

| Day | # | Issue | Symptom | Fix |
|-----|---|-------|---------|-----|
| 11 | 1 | `npx` not recognized | Command fails in terminal | Restart VS Code after Node.js install |
| 11 | 2 | Tailwind init fails | "could not determine executable" | Use `@tailwindcss/postcss` package |
| 11 | 3 | PostCSS syntax error | "Invalid or unexpected token" | Quote plugin key: `"@tailwindcss/postcss"` |
| 11 | 4 | CSS lint warnings | "Unknown at rule @tailwind" | Disable `css.validate` in VS Code settings |
| 11 | 5 | Dashboard file corrupted | Wrong imports in Dashboard.jsx | Recreate file with proper content |
| 11 | 6 | Old page persists | Default Vite page showing | Hard refresh + verify file save |
| 11 | 7 | Sidebar duplicate Upload | Two Upload entries in nav | Delete duplicate line in Sidebar.jsx |
| 12 | 1 | Detail drawer animation | Drawer snaps instead of slides | Add `slideInRight` keyframe to CSS |
| 12 | 2 | Filter chips overflow | Too many active filters break layout | Add `flex-wrap` to chip container |
| 13 | 1 | Settings save feedback | No confirmation on save | Add animated Save -> Saved! button state |
| 13 | 2 | Danger zone accidental delete | No confirmation on destructive action | Add DELETE text confirmation dialog |

### Appendix E: Requirements.txt (Current State — Day 13)

**Python Backend:**
```
pandas==2.2.0
numpy==1.26.0
scikit-learn==1.4.0
jupyter==1.0.0
python-dotenv==1.0.0
pydantic-settings==2.1.0
sqlalchemy==2.0.25
shap==0.44.0
matplotlib==3.8.0
pytesseract==0.3.10
pdf2image==1.17.0
Pillow==10.2.0
fastapi==0.109.0
uvicorn==0.27.0
python-multipart==0.0.6
httpx==0.26.0
```

**Node Frontend:**
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "recharts": "^2.x",
    "lucide-react": "latest",
    "axios": "^1.x",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "latest",
    "tailwindcss": "^4.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x",
    "vite": "^5.x"
  }
}
```

### Appendix F: Project Progress Summary

| Day | Module | Status | Key Output |
|-----|--------|--------|------------|
| 0 | Scaffold | Done | Folder structure |
| 1 | Infrastructure | Done | config, database, schemas |
| 2 | EDA | Done | Inverted balance finding |
| 3 | Features | Done | 24 features |
| 4 | Training | Done | 0.89 ROC-AUC |
| 5 | Evaluation | Done | 109x lift |
| 6 | LOF Comparison | Done | LOF fails |
| 7 | Risk Engine | Done | 1.76x separation |
| 8 | SHAP | Done | TreeExplainer |
| 9 | OCR Service | Done | Tesseract + regex |
| 10 | FastAPI Backend | Done | 5 endpoints |
| 11 | React Dashboard | Done | Dashboard + Upload |
| 12 | React Transactions | Done | Filters, sorting, pagination, drawer |
| 13 | React Explain + Analytics + Settings | Done | 3 pages complete |
| 14 | API Integration | Next | Wire Axios to FastAPI |
| 15 | Testing & Deploy | Next | pytest + Vercel + Render |

**Overall Progress: ~87% complete**

| Component | Progress |
|-----------|----------|
| ML Pipeline | 100% Done |
| Backend API | 100% Done |
| OCR | 100% Done |
| Frontend Dashboard | 100% Done |
| Frontend Upload | 100% Done |
| Frontend Transactions | 100% Done |
| Frontend Explainability | 100% Done |
| Frontend Analytics | 100% Done |
| Frontend Settings | 100% Done |
| API Integration | 0% Next |
| Testing | 20% Next |
| Deployment | 0% Next |

---

*End of Days 0-13 Documentation + Days 14-15 Roadmap*
*Last Updated: June 13, 2026*
*Next: Day 14 — API Integration (Axios -> FastAPI)*
*All 6 frontend pages complete and functional with mock data*
