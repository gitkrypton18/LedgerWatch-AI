# LedgerWatch AI — Session Handoff Document
> Paste this entire document at the start of every new chat session.
> Last updated: Day 0 complete, Day 1 in progress.

---

## 1. Who I Am

I am Kalpit, an Electronics Engineering student targeting ML / software / fintech internships with coding interviews in August. I am building **LedgerWatch AI** as my primary ML portfolio project. I have a solid foundation in classical ML fundamentals but am newer to FastAPI, backend architecture, and deployment.

**My working style:** I want step-by-step instructions with file location context and explanations of *why* each component exists — not just copy-paste code. I learn best when I understand the reasoning framework.

---

## 2. What LedgerWatch AI Is

**One-line pitch:** An OCR-powered financial transaction anomaly detection platform that ingests invoices and CSVs, detects fraud using Isolation Forest, scores risk 0–100 with SHAP explainability, and presents everything in an interactive Streamlit dashboard served via FastAPI.

**The goal:** A recruiter-facing portfolio project that is fully defensible in a technical interview round.

---

## 3. Final Locked Architecture — No More Changes

### Folder Structure

```
ledgerwatch-ai/
│
├── data/
│   ├── raw/                      # PaySim CSV goes here
│   ├── processed/                # Cleaned + engineered features
│   └── sample_invoice.pdf        # One OCR demo file
│
├── saved_models/
│   └── isolation_forest_v1.0.0.joblib
│
├── notebooks/
│   └── lof_comparison.ipynb      # Why IF won over LOF
│
├── src/                          # Core ML + data pipeline
│   ├── __init__.py
│   ├── config.py                 # Reads .env, central settings
│   ├── database.py               # SQLite engine + session
│   ├── schemas.py                # Pydantic validation models
│   ├── data_ingest.py            # Load + validate CSV
│   ├── features.py               # Feature engineering (CRITICAL)
│   ├── train.py                  # Train + save IF model
│   ├── evaluate.py               # Metrics vs PaySim labels
│   ├── risk_engine.py            # Percentile calibration 0–100
│   ├── explain.py                # SHAP TreeExplainer
│   └── ocr_service.py            # Tesseract + regex
│
├── api/
│   ├── __init__.py
│   └── main.py                   # FastAPI — 5 routes
│
├── dashboard/
│   └── app.py                    # Streamlit — 4 pages
│
├── tests/
│   └── test_api.py
│
├── .env                          # Secrets — NOT committed to git
├── .env.example                  # Template for .env
├── .gitignore
├── requirements.txt
├── Dockerfile
├── render.yaml
└── README.md
```

### Locked Decisions

| Decision | Locked Value |
|---|---|
| Dataset | PaySim (Kaggle) — labels used ONLY for validation, not training |
| Primary model | Isolation Forest |
| Comparison model | LOF in notebook only (not in production code) |
| Explainability | SHAP TreeExplainer on Isolation Forest |
| OCR | Tesseract + regex, fixed template, one sample invoice |
| Backend | FastAPI, 5 routes |
| Frontend | Streamlit, 4 pages |
| Deployment | Render (FastAPI) + Streamlit Cloud (dashboard) |
| Timeline | 15 days |
| Database | SQLite via SQLAlchemy |
| Config | `.env` + `config.py` |
| Model versioning | `v1.0.0` in filename |

---

## 4. The 5 API Routes

| Route | What It Does |
|---|---|
| `POST /predict` | Single transaction → risk score + SHAP values |
| `POST /batch-predict` | CSV upload → batch risk scores |
| `GET /transactions` | List stored predictions (paginated) |
| `POST /ocr` | Upload PDF → extracted text + field validation |
| `GET /health` | Service status check |

---

## 5. The 4 Dashboard Pages

| Page | What It Shows |
|---|---|
| Overview | KPIs, risk distribution histogram, upload interface |
| Transactions | Table with risk scores, filters, SHAP waterfall per row |
| Model | IF metrics, LOF comparison chart, feature importance |
| OCR Demo | Upload sample invoice, see extracted fields |

---

## 6. Key Architecture Decisions & Why (Interview Answers)

### Why Isolation Forest as primary model?
- Works well on tabular data without labels (unsupervised)
- Fast inference, scales to millions of rows
- Native `decision_function` gives anomaly scores
- SHAP TreeExplainer supports it cleanly — explainability works end-to-end
- Outperforms OC-SVM on high-dimensional tabular data in practice

### Why not the full ensemble (IF + Autoencoder + LOF + OC-SVM)?
- SHAP breaks on LOF and OC-SVM (no TreeExplainer support, only slow KernelSHAP)
- Combining 4 unsupervised scores into one calibrated score requires labels — which defeats the unsupervised approach
- Autoencoder needs PyTorch/Keras pipeline, separate training loop, and enough data — a sub-project by itself
- A single model understood deeply beats four models understood shallowly in interviews

### Why LOF only in notebook?
- Good interview evidence: "I evaluated both, here's the comparison, here's why IF won"
- LOF doesn't scale beyond ~10k samples cleanly, and has no native SHAP support
- Keeps production code clean

### Why PaySim labels only for validation?
- The model trains fully unsupervised (no labels used during training)
- After training, we inject the fraud labels to measure recall — this gives a real number to quote in interviews
- Honest ML: don't leak labels into training

### Why percentile-based calibration for 0–100 score?
- Percentile rank of anomaly score across training set → naturally bounded 0–100
- No labels needed for calibration
- Interpretable: "score of 87 means more anomalous than 87% of training transactions"

### Why `.env` + `config.py`?
- DB path, model path, contamination parameter should never be hardcoded
- `config.py` reads from `.env` via `python-dotenv`, exposes typed settings
- Shows environment-aware design — interviewers notice this

### Why Dockerfile?
- One interview talking point (containerization knowledge)
- Makes deployment on Render cleaner
- Low cost: one file

---

## 7. The 15-Day Build Plan

| Day | Tasks | Deliverable |
|---|---|---|
| 0 | Scaffold repo, conda env, requirements.txt, .env, git init | Repo live on GitHub |
| 1 | `config.py` → `database.py` → `schemas.py` → `data_ingest.py` + download PaySim | CSV loads, DB initializes |
| 2 | Clean PaySim data, EDA in notebook | `data/processed/cleaned.csv` |
| 3 | `features.py` — engineer all features, document schema | `data/processed/features.csv` |
| 4 | `train.py` — train IF, save as `isolation_forest_v1.0.0.joblib` | Model artifact saved |
| 5 | `evaluate.py` — run against PaySim fraud labels, tune contamination | Recall/precision metrics |
| 6 | `notebooks/lof_comparison.ipynb` — LOF vs IF side-by-side | Comparison notebook |
| 7 | `risk_engine.py` — percentile calibration → 0–100 score | Risk scores on test set |
| 8 | `explain.py` — SHAP TreeExplainer, waterfall plots | SHAP values working |
| 9 | `ocr_service.py` — Tesseract + regex on sample invoice | Extracts amount/date/vendor |
| 10 | `api/main.py` — all 5 FastAPI routes | API running locally |
| 11 | `dashboard/app.py` — all 4 Streamlit pages | Dashboard running locally |
| 12 | `tests/test_api.py` — pytest for all routes | Tests passing |
| 13 | README, screenshots, architecture diagram | Professional docs |
| 14 | Deploy to Render + Streamlit Cloud | Live URL |
| 15 | Buffer — bug fixes, polish | Clean working demo |

---

## 8. Current Status

### Day 0 — COMPLETE ✅

| Task | Status |
|---|---|
| Created `ledgerwatch` conda environment | ✅ |
| Created full project folder structure | ✅ |
| `requirements.txt` created + packages installed | ✅ |
| `.env` + `.env.example` created | ✅ |
| Git initialized + initial commits pushed | ✅ |
| `docs/architecture_decisions.md` started | ✅ |

### Day 1 — IN PROGRESS 🔄

**What was skipped (intentionally, for fresh session):**

| File | Why Skipped |
|---|---|
| `src/config.py` | Needs careful explanation of how it links to other files |
| `src/database.py` | Depends on `config.py` |
| `src/schemas.py` | Depends on `database.py` |
| `src/data_ingest.py` | Depends on all above |

These four files are tightly linked and should be built together in one focused session.

### Day 1 Remaining Tasks (Next Session Picks Up Here)

**Morning:**
1. Build `src/config.py` — reads `.env`, exposes typed settings object
2. Build `src/database.py` — SQLite engine + session factory via SQLAlchemy
3. Build `src/schemas.py` — Pydantic models for Transaction, PredictionResult

**Afternoon:**
4. Download PaySim CSV from Kaggle → `data/raw/`
5. Build `src/data_ingest.py` — load CSV, validate schema, write to DB

**Evening:**
6. Test end-to-end: load CSV → validate → write to DB → print row count
7. Confirm all imports resolve cleanly

**Target:** 3–4 hours of focused work.

---

## 9. The Feature Engineering Schema (Planned for Day 3)

These are the features `features.py` will engineer. Documented here so Day 3 isn't spent deciding — just implementing.

| Feature | What It Captures | How |
|---|---|---|
| `amount_zscore` | Is this amount unusual for this transaction type? | Z-score of amount per type |
| `amount_log` | Scale-normalize amounts | `log1p(amount)` |
| `balance_diff_orig` | Did sender balance drop correctly? | `oldbalanceOrg - newbalanceOrig - amount` |
| `balance_diff_dest` | Did recipient balance increase correctly? | `newbalanceDest - oldbalanceDest - amount` |
| `is_round_amount` | Round numbers are suspicious | `amount % 100 == 0` |
| `hour_of_step` | Time pattern — step modulo 24 | `step % 24` |
| `freq_orig` | How often does this sender transact? | Count of `nameOrig` in dataset |
| `freq_dest` | How often does this recipient receive? | Count of `nameDest` in dataset |
| `type_encoded` | Encode transaction type | Label encode `type` column |
| `zero_balance_orig` | Sender emptied account | `newbalanceOrig == 0` |
| `zero_balance_dest` | Recipient started at zero | `oldbalanceDest == 0` |

---

## 10. The `.env.example` Template

```
# LedgerWatch AI — Environment Variables
# Copy this to .env and fill in values

DATABASE_URL=sqlite:///./ledgerwatch.db
MODEL_PATH=saved_models/isolation_forest_v1.0.0.joblib
RAW_DATA_PATH=data/raw/PS_20174392719_1491204439457_log.csv
PROCESSED_DATA_PATH=data/processed/features.csv
CONTAMINATION=0.01
LOG_LEVEL=INFO
```

---

## 11. Key Interview Talking Points

When asked "walk me through your project":

1. **Problem:** Financial fraud is hard to detect without labels. Real-world fraud data is scarce and imbalanced.
2. **Approach:** Unsupervised anomaly detection — train on normal transactions, flag deviations.
3. **Model choice:** Isolation Forest — explain isolation tree logic, contamination parameter, why it beats OC-SVM on tabular data.
4. **Validation:** "I used PaySim's fraud labels *only* after training to measure recall. Achieved X% recall at Y% precision."
5. **Explainability:** SHAP TreeExplainer — each prediction comes with feature contributions. "The high risk score was driven primarily by a zero destination balance and a round amount."
6. **Score calibration:** Percentile rank of anomaly score — bounded 0–100, no labels needed.
7. **Why not full ensemble:** Give the honest answer from Section 6 above.

---

## 12. How to Start the Next Session

Paste this document and say:

> "I am continuing LedgerWatch AI. Day 0 is complete. I need to build Day 1 remaining tasks: `src/config.py`, `src/database.py`, `src/schemas.py`, and `src/data_ingest.py`. Walk me through each file one at a time with explanations of why each part exists."

The assistant will pick up exactly where you left off.
