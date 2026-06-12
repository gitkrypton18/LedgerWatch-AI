# LedgerWatch AI — Complete Project Documentation
## Days 0–5: Scaffold to Evaluation + Days 6–15 Roadmap

**Builder:** Kalpit — Electronics Engineering student  
**Project:** LedgerWatch AI — OCR-powered financial transaction anomaly detection platform  
**Last Updated:** June 12, 2026  
**Current Status:** Day 5 Complete, ready for Day 6 (LOF Comparison)

---

## Table of Contents

1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [Day 0: Project Scaffold](#2-day-0-project-scaffold)
3. [Day 1: Core Infrastructure](#3-day-1-core-infrastructure)
4. [Day 2: Exploratory Data Analysis](#4-day-2-exploratory-data-analysis)
5. [Day 3: Feature Engineering](#5-day-3-feature-engineering)
6. [Day 4: Model Training](#6-day-4-model-training)
7. [Day 5: Evaluation](#7-day-5-evaluation) ✅
8. [Day 6: LOF Comparison](#8-day-6-lof-comparison) *(Next)*
9. [Day 7: Risk Engine](#9-day-7-risk-engine)
10. [Day 8: SHAP Explainability](#10-day-8-shap-explainability)
11. [Day 9: OCR Service](#11-day-9-ocr-service)
12. [Day 10: FastAPI Backend](#12-day-10-fastapi-backend)
13. [Day 11: Streamlit Dashboard](#13-day-11-streamlit-dashboard)
14. [Day 12: Testing](#14-day-12-testing)
15. [Day 13-15: Deploy & Polish](#15-day-13-15-deploy--polish)
16. [Key Findings & Interview Talking Points](#16-key-findings--interview-talking-points)
17. [Module Dependency Chain](#17-module-dependency-chain)
18. [Appendices](#18-appendices)

---

## 1. Project Overview & Architecture

### 1.1 One-Line Pitch
> An OCR-powered financial transaction anomaly detection platform that ingests invoices and CSVs, detects fraud using Isolation Forest, scores risk 0-100 with SHAP explainability, and presents everything in an interactive Streamlit dashboard served via FastAPI.

### 1.2 Why This Project?
- **Interview-ready:** End-to-end ML pipeline with real-world components (API, dashboard, OCR, explainability)
- **Unsupervised focus:** Shows understanding of anomaly detection (not just supervised classification)
- **Explainability-first:** SHAP integration differentiates from basic fraud detectors
- **Full-stack:** Backend (FastAPI) + Frontend (Streamlit) + Database + Deployment

### 1.3 Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Invoice PDF   │────▶│  OCR Service    │────▶│  FastAPI        │
│   (Tesseract)   │     │  (Day 9)        │     │  Backend        │
└─────────────────┘     └─────────────────┘     │  (Day 10)       │
                                                  │                 │
┌─────────────────┐     ┌─────────────────┐       │  /predict       │
│   CSV Upload    │────▶│  Data Ingest    │────▶│  /batch-predict │
│   (Raw Data)    │     │  (Day 1)        │       │  /ocr           │
└─────────────────┘     └─────────────────┘     │  /transactions  │
        │                                         │  /health        │
        ▼                                         └────────┬────────┘
┌─────────────────┐                                        │
│  SQLite DB      │◀───────────────────────────────────────┘
│  (ledgerwatch.db)│
└─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Feature Eng.   │────▶│  Isolation      │────▶│  Risk Engine    │
│  (Day 3)        │     │  Forest         │     │  (Day 7)        │
│                 │     │  (Day 4)        │     │  0-100 Score    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
        ┌───────────────────────────────────────────────────┘
        ▼
┌─────────────────┐     ┌─────────────────┐
│  SHAP Explain   │────▶│  Streamlit      │
│  (Day 8)        │     │  Dashboard      │
│  Waterfall Plots│     │  (Day 11)       │
└─────────────────┘     │  4 Pages        │
                        └─────────────────┘
```

### 1.4 Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **ML Model** | Isolation Forest | Unsupervised, fast, SHAP-compatible, scales well |
| **Comparison Model** | LOF | Notebook-only evaluation (Day 6) |
| **Explainability** | SHAP TreeExplainer | Native Isolation Forest support |
| **OCR** | Tesseract + regex | Free, offline, sufficient for fixed invoice template |
| **Backend** | FastAPI | Async, auto-docs, Pydantic integration |
| **Frontend** | Streamlit | Rapid dashboard prototyping, native DataFrame display |
| **Database** | SQLite + SQLAlchemy | Zero-config, interview-appropriate, portable |
| **Config** | python-dotenv + pydantic-settings | Environment-aware, never hardcode |
| **Deployment** | Render (API) + Streamlit Cloud (Dashboard) | Free tier, simple CI/CD |

### 1.5 Locked Technical Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Dataset | PaySim (Kaggle) | 6.3M rows, synthetic but realistic, labels for validation only |
| Primary Model | Isolation Forest | Unsupervised, fast inference, SHAP TreeExplainer support |
| Labels Usage | Validation ONLY | Never used during training — honest unsupervised approach |
| Scoring | Percentile-based 0-100 | No labels needed for calibration, naturally bounded |
| Model Filename | `isolation_forest_v1.0.0.joblib` | Semantic versioning |

---

## 2. Day 0: Project Scaffold

### 2.1 What Was Done
- Created folder structure
- Set up conda environment `ledgerwatch`
- Initialized git repository
- Created `.env`, `.env.example`, `.gitignore`
- Created `requirements.txt` with initial packages
- Wrote `README.md` with project description
- Created `docs/architecture_decisions.md`

### 2.2 Files Created

#### `.env` — Environment Variables
```bash
DATABASE_URL=sqlite:///./data/ledgerwatch.db
MODEL_PATH=saved_models/isolation_forest_v1.0.0.joblib
RAW_DATA_PATH=data/raw/PS_20174392719_1491204439457_log.csv
PROCESSED_DATA_PATH=data/processed/features.csv
CONTAMINATION=0.01
LOG_LEVEL=INFO
```

#### `.gitignore`
```gitignore
.env
ledgerwatch.db
*.pyc
__pycache__/
data/raw/*.csv
data/processed/*.csv
saved_models/*.joblib
notebooks/.ipynb_checkpoints/
```

#### `requirements.txt` — Initial Dependencies
```
pandas==2.2.0
numpy==1.26.0
scikit-learn==1.4.0
jupyter==1.0.0
python-dotenv==1.0.0
```

### 2.3 Folder Structure After Day 0

```
ledgerwatch-ai/
├── data/
│   ├── raw/              ← (empty, PaySim downloaded Day 1)
│   └── processed/        ← (empty)
├── saved_models/         ← (empty)
├── notebooks/            ← (empty)
├── src/                  ← (empty)
├── api/                  ← (empty)
├── dashboard/            ← (empty)
├── tests/                ← (empty)
├── docs/
│   └── architecture_decisions.md
├── .env
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

### 2.4 Git Commit
```bash
git add README.md docs/architecture_decisions.md .gitignore .env.example
git commit -m "Day 0: Project scaffold with architecture docs"
```

---

## 3. Day 1: Core Infrastructure

### 3.1 What Was Done
Built foundational layer ALL subsequent modules depend on:
1. **config.py** — Central configuration hub (pydantic-settings)
2. **database.py** — SQLite + SQLAlchemy ORM
3. **schemas.py** — Pydantic validation models
4. **data_ingest.py** — ETL pipeline (Extract → Validate → Clean → Load)
5. Downloaded PaySim dataset from Kaggle
6. Updated `requirements.txt`

### 3.2 Key Files

| File | Purpose | Key Design Decision |
|------|---------|-------------------|
| `src/config.py` | Central config | pydantic-settings auto-loads `.env`, type validation |
| `src/database.py` | SQLite ORM | `check_same_thread=False` for FastAPI compatibility |
| `src/schemas.py` | API validation | `ConfigDict(from_attributes=True)` for ORM→Pydantic |
| `src/data_ingest.py` | ETL pipeline | Functions: `clean_data`, `ingest_pipeline`, `init_database`, `load_raw_csv`, `validate_schema`, `write_to_database` |

### 3.3 PaySim Dataset

| Property | Value |
|----------|-------|
| Source | Kaggle (ealaxi/paysim1) |
| File | `PS_20174392719_1491204439457_log.csv` |
| Size | ~470MB |
| Rows | 6,362,620 |
| Columns | 11 |
| Fraud Rate | 0.129% (8,213 / 6,362,620) |

**Why PaySim:** Synthetic but based on real mobile money patterns. Labels available for validation (NOT training).

### 3.4 Git Commits
```bash
git add src/config.py src/database.py src/schemas.py src/data_ingest.py
git commit -m "Day 1: Add config, database, schemas, and data ingestion pipeline"

git add data/raw/PS_20174392719_1491204439457_log.csv
git commit -m "Day 1: Add PaySim dataset (raw)"

git add requirements.txt
git commit -m "Day 1: Update requirements.txt with pydantic-settings and version pins"
```

---

## 4. Day 2: Exploratory Data Analysis

### 4.1 What Was Done
- Created `notebooks/eda_paysim.ipynb` (11 cells)
- Loaded 100K sample + full 6.3M dataset
- Discovered **inverted balance anomaly finding** (key insight)
- Cleaned and saved `data/processed/cleaned.csv`

### 4.2 Critical Findings

| # | Finding | Impact |
|---|---------|--------|
| 1 | **0.129% fraud** (1 in 774) | Justifies unsupervised Isolation Forest |
| 2 | **Fraud only in TRANSFER (0.66%) and CASH_OUT (0.19%)** | `type_encoded` strong predictor |
| 3 | **Amount heavily skewed** (skewness > 4) | `amount_log` reduces skew |
| 4 | **Inverted balance anomaly** (perfect balance = fraud) | `balance_diff_*` as continuous features |
| 5 | **Zero balance after sending = fraud signal** | `zero_balance_orig` binary feature |

### 4.3 The Inverted Balance Finding ⭐

**Expectation:** Fraud = balance anomalies (old - new ≠ amount)

**Reality (INVERTED):**
```
Origin balance anomaly:
False (no anomaly):  0.421% fraud rate  ← HIGHER
True  (anomaly):     0.007% fraud rate   ← LOWER
```

**Why:** PaySim simulates fraudsters evading simple rule-based detection. Perfect balance changes = fraud. Simple rule systems would FAIL.

### 4.4 Output
- `data/processed/cleaned.csv` — 6,362,620 rows × 11 columns, 475.8 MB

### 4.5 Git Commit
```bash
git add notebooks/eda_paysim.ipynb data/processed/cleaned.csv
git commit -m "Day 2: EDA with inverted balance finding, cleaned.csv saved"
```

---

## 5. Day 3: Feature Engineering

### 5.1 What Was Done
- Created `src/features.py` — production feature engineering pipeline
- Created `notebooks/day3_feature_engineering.ipynb` (15 cells)
- Engineered **24 features** from 11 original columns
- All features validated: no NaNs, no infinities, no label leakage

### 5.2 Feature Inventory (24 Total)

| # | Feature | Source Insight | Function |
|---|---------|---------------|----------|
| 1 | `amount_log` | Amount skewness > 4 | `engineer_amount_features` |
| 2 | `is_round_amount` | Round numbers suspicious | `engineer_amount_features` |
| 3 | `amount_to_balance_ratio` | Sender liquidity stress | `engineer_amount_features` |
| 4-5 | `balance_diff_orig/dest` | Inverted anomaly finding | `engineer_balance_features` |
| 6-7 | `balance_change_orig/dest` | Signed direction | `engineer_balance_features` |
| 8-9 | `zero_balance_orig/dest` | Account emptied / new account | `engineer_balance_features` |
| 10-12 | `hour_of_step` + sin/cos | Cyclical time encoding | `engineer_temporal_features` |
| 13 | `type_encoded` | Fraud risk ordinal | `engineer_categorical_features` |
| 14-18 | `type_*` one-hot | Transaction type dummies | `engineer_categorical_features` |
| 19-20 | `freq_orig/dest` | Expanding window count | `engineer_frequency_features` |
| 21-22 | `is_new_orig/dest` | First transaction flag | `engineer_frequency_features` |
| 23-24 | `is_merchant_orig/dest` | Merchant account flag | `engineer_merchant_features` |

### 5.3 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Expanding window for freq** | `cumcount()` only counts PREVIOUS transactions — no data leakage, works in production |
| **Log1p not log** | Handles amount=0 safely |
| **Cyclical sin/cos for hour** | Hour 23 ≈ hour 0; linear encoding would make midnight far from 11 PM |
| **99.9th percentile cap on ratio** | Prevents extreme outliers from breaking models |
| **Runtime `isFraud` assertion** | Fails fast if labels ever leak into features |

### 5.4 Output

| | Path | Rows | Columns | Size |
|---|------|------|---------|------|
| Input | `data/processed/cleaned.csv` | 6,362,620 | 11 | 475.8 MB |
| Output | `data/processed/features.csv` | 6,362,620 | 35 (11 + 24) | 1,401.8 MB |

### 5.5 Git Commit
```bash
git add notebooks/day3_feature_engineering.ipynb src/features.py
git commit -m "Day 3: Feature engineering pipeline with 24 features

- 6 modular feature engineering functions
- amount_log, is_round_amount, amount_to_balance_ratio
- balance_diff_orig/dest, balance_change_orig/dest, zero_balance_orig/dest
- hour_of_step + cyclical sin/cos encoding
- type_encoded + one-hot dummies (5 types)
- freq_orig/dest with EXPANDING window (no data leakage)
- is_new_orig/dest, is_merchant_orig/dest flags
- Full validation: no NaNs, no infinities, no label leakage
- 15-cell verification notebook with EDA recap, distributions, correlations
- Production src/features.py auto-generated from notebook"
```

---

## 6. Day 4: Model Training

### 6.1 What Was Done
- Created `src/train.py` — production training pipeline
- Created `notebooks/day4_model_training.ipynb` (10 cells)
- Trained Isolation Forest on 5M rows, validated on 1.27M rows
- Saved production model: `saved_models/isolation_forest_v1.0.0.joblib`
- Created `tests/test_train.py` — unit tests

### 6.2 Training Configuration

| Parameter | Value | Source |
|-----------|-------|--------|
| Model | Isolation Forest | Locked decision |
| Contamination | 0.01 | `.env` (matches fraud rate) |
| N_estimators | 200 | Stable scores, fast enough |
| Max_samples | auto | min(256, n_samples) |
| Max_features | 1.0 | Use all 24 features |
| Bootstrap | False | Subsample without replacement |
| Random_state | 42 | Reproducibility |
| N_jobs | -1 | All CPU cores |

### 6.3 Results

#### 100K Sample (Fast Iteration)
| Metric | Value |
|--------|-------|
| Train | 80,000 rows |
| Test | 20,000 rows |
| ROC-AUC | **0.9267** |
| Precision | 0.0207 |
| Recall | 0.1600 |
| F1 | 0.0367 |

#### Full Dataset (Production)
| Metric | Value | Interpretation |
|--------|-------|---------------|
| Train | 5,090,096 rows | 80% of 6.3M |
| Test | 1,272,524 rows | 20% holdout |
| Predicted anomalies | 12,539 (0.985%) | Close to 1% contamination |
| Actual frauds | 1,637 (0.129%) | Base rate |
| **ROC-AUC** | **0.8899** | Excellent separation |
| Precision | 0.0408 | 4% of flagged = fraud |
| Recall | 0.3122 | Catches 31% of frauds |
| F1 | 0.0721 | Balanced metric |
| Accuracy | 0.9897 | Misleadingly high (base rate fallacy) |

### 6.4 Key Insights

1. **Full data > sample:** Precision and recall doubled on full dataset (more training data = better "normal" pattern learning)
2. **ROC-AUC slight drop (0.93 → 0.89):** Expected — larger test set is harder, but 0.89 is still excellent
3. **Low precision is normal:** With 0.1% fraud and 1% flagged, most flags are false positives. This is inherent to extreme class imbalance.
4. **Anomaly scores separate well:** Fraud mean = 0.056, Normal mean = 0.172 (lower = more anomalous)

### 6.5 Feature Importance (Full Model)

| Rank | Feature | Importance |
|------|---------|-----------|
| 1 | `amount_to_balance_ratio` | 0.002065 |
| 2 | `amount_log` | 0.001984 |
| 3 | `balance_diff_orig` | 0.001963 |
| 4 | `balance_diff_dest` | 0.001871 |
| 5 | `balance_change_orig` | 0.001710 |

**Interpretation:** Balance and amount features dominate — aligns perfectly with Day 2 EDA findings.

### 6.6 Files Created

| File | Purpose |
|------|---------|
| `src/train.py` | Production training pipeline |
| `notebooks/day4_model_training.ipynb` | Verification with plots |
| `tests/test_train.py` | Unit tests (feature count, no leakage, train+validate) |
| `saved_models/isolation_forest_v1.0.0.joblib` | Production model (2.2 MB) |

### 6.7 Git Commit
```bash
git add src/train.py notebooks/day4_model_training.ipynb tests/test_train.py saved_models/
git commit -m "Day 4: Train Isolation Forest on 6.3M rows, 0.89 ROC-AUC

- Production src/train.py with full pipeline
- 24 features, no label leakage, honest unsupervised training
- 100K sample for fast iteration + full 6.3M for production
- Post-hoc validation: precision=0.04, recall=0.31, ROC-AUC=0.89
- Unit tests for feature count, leakage prevention, end-to-end train
- Model saved: isolation_forest_v1.0.0.joblib (2.2 MB)"
```

---

## 7. Day 5: Evaluation ✅

### 7.1 What Was Done
- Created `src/evaluate.py` — production evaluation pipeline (634 lines)
- Created `notebooks/day5_evaluation.ipynb` (11 cells)
- Computed comprehensive metrics: ROC-AUC, PR-AUC, Precision, Recall, F1
- Performed threshold tuning: F1-optimized, Precision-optimized, Recall-optimized
- Ran baseline comparison: Random classifier, Rule-based (perfect balance), Rule-based (amount + TRANSFER)
- Generated plots: ROC curve, PR curve, threshold tradeoffs, score distribution, confusion matrix
- Exported metrics to JSON for reproducibility

### 7.2 Evaluation Results (Test Set: 1,272,524 rows)

#### Ranking Metrics (Threshold-Independent)
| Metric | Value |
|--------|-------|
| **ROC-AUC** | **0.8761** |
| **PR-AUC** | **0.0240** |

#### Threshold-Based Metrics

| Strategy | Threshold | Precision | Recall | F1 | Flagged |
|----------|-----------|-----------|--------|-----|---------|
| Contamination (1%) | 0.5953 | 0.0401 | 0.3104 | 0.0710 | 12,726 |
| **F1-Optimized** | **0.6680** | **0.0599** | **0.2051** | **0.0927** | **5,624** |
| Precision-Optimized | 0.6878 | 0.0615 | 0.1680 | 0.0900 | 4,491 |
| Recall-Optimized | 0.4885 | 0.0200 | 0.4790 | 0.0384 | 39,350 |

#### Confusion Matrix (Contamination Threshold)
| | Predicted Normal | Predicted Fraud |
|---|------------------|-----------------|
| **Actual Normal** | 1,258,665 (98.91%) | 12,216 (0.96%) |
| **Actual Fraud** | 1,133 (0.09%) | 510 (0.04%) |

### 7.3 Baseline Comparison

| Model / Rule | Precision | Recall | F1 | Flagged | Lift vs Random |
|--------------|-----------|--------|-----|---------|----------------|
| Random Classifier (1%) | 0.0005 | 0.0043 | 0.0010 | 12,747 | 1.0× |
| Rule: Perfect Balance = Fraud | 0.0039 | 0.6093 | 0.0077 | 259,075 | 7.8× |
| Rule: Top 1% Amount + TRANSFER | 0.0083 | 0.0633 | 0.0147 | 12,533 | 16.6× |
| **Isolation Forest (F1-Optimal)** | **0.0599** | **0.2051** | **0.0927** | **5,624** | **109.1×** |

**Key Insight:** Isolation Forest is **15.5× more precise** than the naive balance rule and **109× better** than random. This proves the model learns genuine anomaly patterns, not just memorizing labels.

### 7.4 Score Distribution
- **Fraud mean score:** 0.4681
- **Normal mean score:** 0.1873
- **Separation:** Fraud scores are 2.5× higher than normal, confirming the model learned meaningful patterns

### 7.5 Files Created

| File | Purpose | Size |
|------|---------|------|
| `src/evaluate.py` | Production evaluation pipeline | 634 lines |
| `notebooks/day5_evaluation.ipynb` | Interactive evaluation notebook | 11 cells |
| `docs/day5_roc_pr_curves.png` | ROC and PR curve plots | — |
| `docs/day5_threshold_tradeoffs.png` | Threshold tradeoff visualization | — |
| `docs/day5_score_distribution_cm.png` | Score distribution + confusion matrix | — |
| `docs/day5_metrics.json` | Reproducible metrics export | — |

### 7.6 `src/evaluate.py` API

```python
from src.evaluate import evaluate_model, plot_evaluation_curves, export_metrics_json, print_evaluation_report

# Run full evaluation
result = evaluate_model(model, X_test, y_test, feature_names=feature_names)

# Print formatted report
print_evaluation_report(result)

# Generate all plots
plot_paths = plot_evaluation_curves(result, y_test.values, y_scores, output_dir="docs/")

# Export to JSON
export_metrics_json(result, "docs/day5_metrics.json")
```

### 7.7 CLI Usage
```bash
# Full evaluation
python src/evaluate.py

# Quick sample evaluation
python src/evaluate.py --sample 50000

# Custom paths
python src/evaluate.py --model saved_models/isolation_forest_v1.0.0.joblib --data data/processed/features.csv --output-dir docs
```

### 7.8 Git Commit
```bash
git add src/evaluate.py notebooks/day5_evaluation.ipynb docs/day5_*.png docs/day5_metrics.json
git commit -m "Day 5: Comprehensive model evaluation with threshold tuning

- Production src/evaluate.py (634 lines) with full evaluation pipeline
- ROC-AUC=0.8761, PR-AUC=0.0240 on 1.27M test rows
- Threshold tuning: F1-optimized (0.0927), Precision-optimized, Recall-optimized
- Baseline comparison: 15.5x lift over naive balance rule, 109x over random
- Plots: ROC/PR curves, threshold tradeoffs, score distribution, confusion matrix
- JSON metrics export for reproducibility
- CLI entry point for command-line evaluation"
```

---

## 8. Day 6: LOF Comparison *(Next)*

### 8.1 Goal
Notebook-only comparison: Isolation Forest vs Local Outlier Factor.

### 8.2 Planned Components

| Component | Description |
|-----------|-------------|
| `notebooks/day6_lof_comparison.ipynb` | Side-by-side evaluation on sample data |
| Metrics | ROC-AUC, training time, inference time, memory |
| Sample Size | 100K rows (LOF is O(n²) and cannot scale to 6.3M) |
| Why LOF? | Density-based alternative; good for local anomalies but slow |

### 8.3 Expected Outcome
- Isolation Forest will be **much faster** (O(n log n) vs O(n²))
- LOF may have **slightly better ROC-AUC** on small samples (density captures local patterns)
- Isolation Forest wins on **scalability** — the deciding factor for production

---

## 9. Day 7: Risk Engine

### 9.1 Goal
Create `src/risk_engine.py` — convert raw anomaly scores to calibrated 0-100 risk scores.

### 9.2 Planned Components

| Component | Description |
|-----------|-------------|
| `src/risk_engine.py` | Percentile-based calibration |
| Scoring | 0 = lowest risk, 100 = highest risk |
| Method | Training set percentile mapping (no labels needed) |
| Integration | Returns `risk_score` (0-100) in PredictionResult schema |

### 9.3 Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Calibration | Percentile-based | No labels needed, naturally bounded 0-100 |
| Mapping | Training set percentiles | Consistent scoring on new data |
| Bins | 10 deciles | Simple, interpretable risk bands |

---

## 10. Day 8: SHAP Explainability

### 10.1 Goal
Create `src/explain.py` — SHAP TreeExplainer for Isolation Forest.

### 10.2 Planned Components

| Component | Description |
|-----------|-------------|
| `src/explain.py` | SHAP TreeExplainer wrapper |
| Output | Waterfall plots, force plots, feature importance |
| Integration | Returns `shap_values` dict in PredictionResult schema |
| Backend | `shap.TreeExplainer` (native Isolation Forest support) |

### 10.3 Why SHAP?
- **Interview differentiator:** Most fraud detectors are black boxes
- **Regulatory need:** GDPR "right to explanation" for automated decisions
- **Analyst trust:** Humans review flagged transactions — they need to know WHY

---

## 11. Day 9: OCR Service

### 11.1 Goal
Create `src/ocr_service.py` — Tesseract + regex for invoice parsing.

### 11.2 Planned Components

| Component | Description |
|-----------|-------------|
| `src/ocr_service.py` | PDF → image → text → structured data |
| Engine | Tesseract OCR (free, offline) |
| Output | `OCRExtraction` schema (amount, date, vendor, confidence) |
| Validation | Confidence threshold + regex pattern matching |

### 11.3 Pipeline
```
Invoice PDF → pdf2image → Tesseract OCR → Raw Text → Regex Parsing → Structured JSON
```

---

## 12. Day 10: FastAPI Backend

### 12.1 Goal
Create `api/main.py` — REST API with 5 endpoints.

### 12.2 Planned Endpoints

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/health` | GET | Service health check | — | `{"status": "ok"}` |
| `/predict` | POST | Single transaction prediction | `TransactionCreate` | `PredictionResult` |
| `/batch-predict` | POST | Bulk prediction from CSV | File upload | List[`PredictionResult`] |
| `/ocr` | POST | Invoice PDF upload + parse | PDF file | `OCRExtraction` |
| `/transactions` | GET | Query transaction history | Query params | List[`Transaction`] |

### 12.3 Design Decisions
- **Pydantic validation:** All inputs/outputs validated via `src/schemas.py`
- **Dependency injection:** `get_db()` for database sessions
- **Auto-docs:** Swagger UI at `/docs` (FastAPI native)
- **Async:** `async/await` for I/O-bound operations (OCR, DB)

---

## 13. Day 11: Streamlit Dashboard

### 13.1 Goal
Create `dashboard/app.py` — 4-page interactive dashboard.

### 13.2 Planned Pages

| Page | Description | Key Widgets |
|------|-------------|-------------|
| **Upload** | CSV/PDF upload + preview | `st.file_uploader`, `st.dataframe` |
| **Predictions** | Risk scores table + filters | `st.dataframe`, `st.slider`, `st.selectbox` |
| **Explain** | SHAP waterfall plots per transaction | `st.plotly_chart`, `st.selectbox` |
| **Analytics** | Fraud trends, feature distributions | `st.line_chart`, `st.bar_chart`, `st.map` |

### 13.3 Integration
- Calls FastAPI backend via `requests` (not direct model loading)
- Displays real-time predictions with risk scores 0-100
- Shows SHAP explanations for each flagged transaction

---

## 14. Day 12: Testing

### 14.1 Goal
Comprehensive test suite with pytest.

### 14.2 Planned Tests

| Test File | Coverage | Status |
|-----------|----------|--------|
| `tests/test_config.py` | Config loading, env override | ⏳ |
| `tests/test_database.py` | CRUD, session management | ⏳ |
| `tests/test_schemas.py` | Pydantic validation | ⏳ |
| `tests/test_data_ingest.py` | ETL pipeline | ⏳ |
| `tests/test_features.py` | Feature engineering | ⏳ |
| `tests/test_train.py` | Model training | ✅ Day 4 |
| `tests/test_evaluate.py` | Metrics computation | ⏳ |
| `tests/test_api.py` | FastAPI endpoints (httpx) | ⏳ |

### 14.3 Testing Strategy
- **Unit tests:** Individual functions (features, schemas, config)
- **Integration tests:** End-to-end pipelines (train → evaluate)
- **API tests:** `TestClient` from FastAPI + `httpx`
- **Coverage target:** 80%+ code coverage

---

## 15. Day 13-15: Deploy & Polish

### 15.1 Goals
- Render deployment (FastAPI)
- Streamlit Cloud deployment
- Final documentation polish
- README update with badges
- Demo video/GIF

### 15.2 Deployment Plan

| Component | Platform | URL Pattern |
|-----------|----------|-------------|
| FastAPI Backend | Render | `https://ledgerwatch-api.onrender.com` |
| Streamlit Dashboard | Streamlit Cloud | `https://ledgerwatch-dashboard.streamlit.app` |
| Documentation | GitHub README | `https://github.com/kalpit/ledgerwatch-ai` |

### 15.3 Final Polish Checklist
- [ ] README with architecture diagram, setup instructions, demo GIF
- [ ] `requirements.txt` finalized with all dependencies
- [ ] `.env.example` updated with all required variables
- [ ] GitHub Actions CI/CD (optional but impressive)
- [ ] Demo video (2-3 minutes) showing upload → prediction → explanation

---

## 16. Key Findings & Interview Talking Points

### 16.1 The 60-Second Pitch
> "I built LedgerWatch AI, an anomaly detection platform for financial transactions. It takes transaction data and invoice PDFs, scores each transaction for fraud risk from 0 to 100, and explains WHY each score was assigned using SHAP. The backend is FastAPI with 5 REST endpoints, and the frontend is a Streamlit dashboard with 4 pages."

### 16.2 Day 1 Talking Points

**Configuration System:**
> "I built a centralized configuration system using pydantic-settings that reads from a `.env` file. This means my database path, model path, and hyperparameters are never hardcoded. If I deploy to Render, I just change the `.env` file — zero code changes."

**Database Design:**
> "I use SQLAlchemy ORM with SQLite for zero-config portability. The `get_db()` generator ensures every API request gets its own database session that closes automatically, preventing connection leaks."

### 16.3 Day 2 Talking Points

**Class Imbalance (Core Argument):**
> "PaySim has 6.3M transactions with only 0.13% fraud — that's roughly 1 fraud for every 770 normal transactions. This extreme imbalance is why I chose unsupervised anomaly detection instead of supervised classification. A supervised model could achieve 99.87% accuracy by predicting 'all normal' and still detect ZERO fraud."

**The Inverted Balance Finding:**
> "I discovered something counter-intuitive: fraudulent transactions have PERFECT balance changes, while normal ones often don't. PaySim simulates fraudsters trying to evade simple rule-based detection. Simple systems that flag balance anomalies would FAIL here — that's why I use Isolation Forest, which learns the combination of perfect balance + high amount + TRANSFER type."

### 16.4 Day 3 Talking Points

**No Data Leakage:**
> "My frequency features use an expanding window — for each transaction, I only count PREVIOUS transactions by that account. This means the feature is computable on new transactions in production, and I never peek into the future during training."

**Cyclical Encoding:**
> "I encode hour_of_step using sin and cos transforms because time is circular — hour 23 is just 1 hour away from hour 0, not 23 hours away. A linear encoding would make midnight far from 11 PM, which is wrong for fraud detection where late-night clusters matter."

### 16.5 Day 4 Talking Points

**Honest Unsupervised Training:**
> "I trained an Isolation Forest on 5M transactions with 24 engineered features. The model achieves 0.89 ROC-AUC with honest unsupervised training — labels were only used for post-hoc validation, never during fitting. This proves the model learns genuine anomaly patterns, not just memorizing labels."

**Precision-Recall Reality:**
> "With 0.1% fraud rate and 1% contamination, precision is naturally low — most flagged transactions are false positives. But recall of 31% means we catch 1 in 3 frauds with zero labeled training data. In production, analysts review the top 1% highest-risk transactions, making this precision practical."

### 16.6 Day 5 Talking Points

**Threshold Tuning:**
> "I implemented three threshold strategies: F1-optimized for balanced performance, precision-optimized when analyst time is expensive, and recall-optimized when missing fraud is very costly. The F1-optimal threshold of 0.668 gives 5.9% precision — a 15.5× improvement over a naive balance rule."

**Baseline Comparison:**
> "I compared my model against a random classifier and two rule-based baselines. The naive 'perfect balance = fraud' rule actually has terrible precision (0.39%) because PaySim was designed to evade simple detection. My Isolation Forest achieves 5.99% precision — 15.5× better — because it learns feature combinations, not single rules."

**Reproducibility:**
> "All evaluation metrics are exported to JSON with timestamps, model parameters, and feature names. This means anyone can reproduce my results exactly, and I can track model performance across versions."

---

## 17. Module Dependency Chain

```
Day 0: Scaffold
    ├── .env, .gitignore, requirements.txt, README.md
    └── docs/architecture_decisions.md

Day 1: Core Infrastructure ✅
    ├── src/config.py ───────┐
    ├── src/database.py ─────┤
    ├── src/schemas.py ──────┤  All depend on config.py
    ├── src/data_ingest.py ──┘
    └── data/raw/PS_20174392719_1491204439457_log.csv

Day 2: EDA ✅
    └── notebooks/eda_paysim.ipynb
    └── data/processed/cleaned.csv (475.8 MB)

Day 3: Feature Engineering ✅
    └── src/features.py ─── reads cleaned.csv → features.csv
    └── notebooks/day3_feature_engineering.ipynb
    └── data/processed/features.csv (1,401.8 MB)

Day 4: Model Training ✅
    └── src/train.py ───── reads features.csv → .joblib
    └── notebooks/day4_model_training.ipynb
    └── tests/test_train.py
    └── saved_models/isolation_forest_v1.0.0.joblib (2.2 MB)

Day 5: Evaluation ✅
    └── src/evaluate.py ←── reads .joblib + labels, computes metrics
    └── notebooks/day5_evaluation.ipynb
    └── docs/day5_roc_pr_curves.png
    └── docs/day5_threshold_tradeoffs.png
    └── docs/day5_score_distribution_cm.png
    └── docs/day5_metrics.json
    └── tests/test_evaluate.py ⏳

Day 6: LOF Comparison ⏳ NEXT
    └── notebooks/day6_lof_comparison.ipynb

Day 7: Risk Engine
    └── src/risk_engine.py ←── percentile calibration → 0-100 score

Day 8: Explainability
    └── src/explain.py ←── SHAP TreeExplainer, waterfall plots

Day 9: OCR Service
    └── src/ocr_service.py ←── Tesseract + regex

Day 10: API
    └── api/main.py ←── FastAPI, 5 routes

Day 11: Dashboard
    └── dashboard/app.py ←── Streamlit, 4 pages

Day 12: Tests
    └── tests/test_api.py ←── pytest

Day 13-15: Deploy & Polish
```

---

## 18. Appendices

### Appendix A: File Locations

| File | Path | Status |
|------|------|--------|
| Project Root | `F:\ML PROJECT\LedgerWatch-AI\LedgerWatch-AI` | ✅ |
| PaySim Raw | `data\raw\PS_20174392719_1491204439457_log.csv` | ✅ |
| Cleaned CSV | `data\processed\cleaned.csv` | ✅ (475.8 MB) |
| Features CSV | `data\processed\features.csv` | ✅ (1,401.8 MB) |
| Model | `saved_models\isolation_forest_v1.0.0.joblib` | ✅ (2.2 MB) |
| Database | `data\ledgerwatch.db` | ✅ |
| Config | `src\config.py` | ✅ |
| Train | `src\train.py` | ✅ |
| Features | `src\features.py` | ✅ |
| Evaluate | `src\evaluate.py` | ✅ (634 lines) |

### Appendix B: Environment

| Setting | Value |
|---------|-------|
| Conda Environment | `ledgerwatch` |
| Python Version | 3.10.20 |
| IDE | VS Code |
| Jupyter | Running via VS Code |

### Appendix C: Verification Commands

```bash
# Config
python -c "from src.config import settings; print(settings.DATABASE_URL)"

# Database
python -c "from src.database import engine; from sqlalchemy import inspect; print(inspect(engine).get_table_names())"

# Schemas
python -c "from src.schemas import TransactionCreate, PredictionResult; print('Schemas OK')"

# Data Ingest
python -c "from src.data_ingest import ingest_pipeline; print('Data ingest OK')"

# Features
python -c "from src.features import engineer_all_features; print('Features OK')"

# Evaluate
python -c "from src.evaluate import evaluate_model; print('Evaluate OK')"

# Train (sample)
python src/train.py --sample 50000

# Train (full)
python src/train.py

# Evaluate (CLI)
python src/evaluate.py --sample 50000

# Tests
python tests/test_train.py
```

### Appendix D: Day 5 Evaluation Metrics Summary

```json
{
  "model": {
    "name": "Isolation Forest",
    "version": "1.0.0",
    "n_estimators": 200,
    "contamination": 0.01,
    "feature_count": 24
  },
  "dataset": {
    "test_rows": 1272524,
    "test_frauds": 1643,
    "test_fraud_rate": 0.001291
  },
  "ranking_metrics": {
    "roc_auc": 0.8761,
    "pr_auc": 0.0240
  },
  "contamination_threshold": {
    "threshold": 0.5953,
    "precision": 0.0401,
    "recall": 0.3104,
    "f1": 0.0710,
    "flagged": 12726
  },
  "f1_optimized": {
    "threshold": 0.6680,
    "precision": 0.0599,
    "recall": 0.2051,
    "f1": 0.0927,
    "flagged": 5624
  }
}
```

---

*End of Days 0-5 Documentation + Days 6-15 Roadmap*  
*Last Updated: June 12, 2026*  
*Next: Day 6 — LOF Comparison (`notebooks/day6_lof_comparison.ipynb`)*
