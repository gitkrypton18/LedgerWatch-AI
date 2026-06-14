<div align="center">

# 🔍 LedgerWatch AI

**OCR-powered financial transaction anomaly detection platform**

[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4-F7931E?logo=scikitlearn)](https://scikit-learn.org)
[![SHAP](https://img.shields.io/badge/SHAP-0.44-red)](https://shap.readthedocs.io)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[🚀 Live Demo](https://ledgerwatch-ai.vercel.app) · [📖 API Docs](https://ledgerwatch-api.onrender.com/docs) · [📊 Kaggle Dataset](https://www.kaggle.com/datasets/ealaxi/paysim1)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Results](#-key-results)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Interview Talking Points](#-interview-talking-points)
- [Deployment](#-deployment)
- [License](#-license)

---

## 🎯 Overview

LedgerWatch AI is a **full-stack fraud detection platform** that ingests financial transactions (CSV uploads) and invoice PDFs, detects anomalies using an **Isolation Forest** trained on 6.3M synthetic transactions, scores each transaction 0-100 for fraud risk, and explains every prediction with **SHAP** visualizations — all served through a professional React dashboard.

### What Makes This Different

| Feature | Why It Matters |
|---------|---------------|
| **Unsupervised Learning** | No labels needed during training — works on unlabeled real-world data |
| **SHAP Explainability** | Every prediction comes with a "why" — critical for compliance |
| **OCR Invoice Parsing** | Extracts structured data from PDFs/images using Tesseract |
| **Percentile-Based Risk** | 0-100 score calibrated without ever seeing fraud labels |
| **Full-Stack Production** | FastAPI backend + React frontend + SQLite database |

---

## 🏆 Key Results

### Model Performance (PaySim Dataset — 6,362,620 transactions)

| Metric | Value | Interpretation |
|--------|-------|----------------|
| **ROC-AUC** | **0.8946** | Excellent discrimination |
| **Precision@Top-1%** | 10.9% | 109× better than random |
| **Lift@Top-1%** | **109×** | 109x more fraud in top 1% vs baseline |
| **Lift@Top-5%** | 32× | 32x better than random |
| **Fraud Mean Risk** | 87.4/100 | Clear separation from normal (49.6) |
| **Separation Ratio** | **1.76×** | Fraud scores 1.76× higher than normal |

### LOF Comparison (Why Isolation Forest Won)

| Model | ROC-AUC | Training Time | Inference | Verdict |
|-------|---------|---------------|-----------|---------|
| **Isolation Forest** | **0.8946** | ~3 min | ~50ms/1K | ✅ Primary |
| LOF | 0.5571 | >30 min | >5 min/1K | ❌ Fails at scale |

> LOF's O(n²) complexity makes it computationally infeasible for 6.3M rows. Isolation Forest's O(n log n) scaling is the right choice.

---

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────┐
│ Invoice PDF │────▶│ OCR Service │────▶│      FastAPI Backend        │
│  (Tesseract)│     │   (Day 9)   │     │      (Day 10 + 10.5)        │
└─────────────┘     └─────────────┘     │  • /predict                 │
                                         │  • /batch-predict           │
┌─────────────┐     ┌─────────────┐     │  • /ocr                     │
│ CSV Upload  │────▶│ Data Ingest │────▶│  • /transactions            │
│  (Raw Data) │     │   (Day 1)   │     │  • /stats                   │
└─────────────┘     └─────────────┘     └──────────────┬──────────────┘
                                                        │
       ┌────────────────────────────────────────────────┘
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SQLite Database                             │
│                    (ledgerwatch.db)                                 │
└─────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Feature    │───▶│   Isolation  │───▶│ Risk Engine  │
│ Engineering  │    │   Forest     │    │  (0-100)     │
│  (24 feats)  │    │ (Day 4)      │    │ (Day 7)      │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                                │
       ┌────────────────────────────────────────┘
       ▼
┌──────────────┐    ┌─────────────────────────────────────────────────┐
│ SHAP Explain │───▶│           React Frontend (Days 11-13)           │
│   (Day 8)    │    │  Vite + Tailwind v4 + Recharts + React Router   │
└──────────────┘    │  • Dashboard (KPIs, charts, risk ring)          │
                    │  • Upload (drag-drop, batch processing)         │
                    │  • Transactions (filter, sort, pagination)      │
                    │  • Explainability (SHAP waterfall charts)       │
                    │  • Analytics (ROC, lift, feature importance)    │
                    │  • Settings (API config, theme, notifications)  │
                    └─────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11 | Core language |
| **FastAPI** | 0.109 | Async REST API framework |
| **SQLAlchemy** | 2.0 | ORM + database management |
| **Pydantic** | v2 | Request/response validation |
| **scikit-learn** | 1.4 | Isolation Forest model |
| **SHAP** | 0.44 | Model explainability (TreeExplainer) |
| **Tesseract** | 5.x | OCR for invoice parsing |
| **Uvicorn** | 0.27 | ASGI server |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18 | UI framework |
| **Vite** | 5 | Build tool |
| **Tailwind CSS** | v4 | Utility-first styling |
| **Recharts** | 2 | Data visualization |
| **React Router** | 6 | Client-side routing |
| **Lucide React** | latest | Icons |
| **Axios** | 1 | HTTP client |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| **SQLite** | Zero-config database |
| **Render** | FastAPI backend hosting |
| **Vercel** | React frontend hosting |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Tesseract OCR (optional — mock mode works without it)

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/LedgerWatch-AI.git
cd LedgerWatch-AI
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn backend.main:app --reload
```

API runs at `http://localhost:8000`
Swagger UI: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///ledgerwatch.db` | SQLite database path |
| `MODEL_PATH` | `saved_models/isolation_forest_v1.0.0.joblib` | Trained model |
| `RISK_ENGINE_PATH` | `saved_models/risk_engine_v1.0.0.joblib` | Risk calibration |
| `API_KEY` | `demo-key-123` | API authentication |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed frontend origins |

---

## 📡 API Reference

### Authentication

All endpoints except `/health` require `X-API-Key` header:
```bash
curl -H "X-API-Key: demo-key-123" http://localhost:8000/stats
```

### Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/health` | GET | Service health check | ❌ Public |
| `/predict` | POST | Single transaction prediction | ✅ API Key |
| `/batch-predict` | POST | Bulk CSV prediction (max 10MB) | ✅ API Key |
| `/ocr` | POST | Invoice PDF/image parsing | ✅ API Key |
| `/transactions` | GET | Query transaction history | ✅ API Key |
| `/transactions/{id}` | GET | Get single transaction | ✅ API Key |
| `/stats` | GET | Dashboard statistics | ✅ API Key |

### Example: Predict Fraud Risk

```bash
curl -X POST "http://localhost:8000/predict?explain=true" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo-key-123" \
  -d '{
    "step": 1,
    "type": "TRANSFER",
    "amount": 181.00,
    "nameOrig": "C123456789",
    "oldbalanceOrg": 181.00,
    "newbalanceOrig": 0.00,
    "nameDest": "M987654321",
    "oldbalanceDest": 0.00,
    "newbalanceDest": 0.00
  }'
```

**Response:**
```json
{
  "transaction_id": 1,
  "anomaly_score": -0.6403,
  "risk_score": 99,
  "risk_band": "Critical",
  "is_anomaly": true,
  "shap_values": {
    "is_round_amount": 1.60,
    "type_TRANSFER": 1.06,
    "amount_log": 0.84
  },
  "top_features": ["is_round_amount", "type_TRANSFER", "amount_log"]
}
```

---

## 📁 Project Structure

```
LedgerWatch-AI/
├── backend/                    # FastAPI application
│   ├── __init__.py
│   └── main.py                 # 7 REST endpoints
├── frontend/                   # React dashboard
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── analytics/      # Charts (ROC, lift, distribution)
│   │   │   ├── explain/        # SHAP waterfall, feature importance
│   │   │   ├── layout/         # Sidebar, TopBar, Layout
│   │   │   ├── settings/       # ToggleSwitch, InputField, DangerZone
│   │   │   └── transactions/   # Table, FilterBar, Pagination, DetailDrawer
│   │   ├── pages/              # 6 page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   ├── TransactionsPage.jsx
│   │   │   ├── ExplainabilityPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── App.jsx             # React Router setup
│   │   ├── main.jsx
│   │   └── index.css           # Tailwind v4 theme tokens
│   ├── package.json
│   └── vite.config.js
├── src/                        # Python ML pipeline
│   ├── config.py               # Pydantic settings + .env
│   ├── database.py             # SQLAlchemy ORM
│   ├── schemas.py              # Pydantic request/response models
│   ├── features.py             # 24-feature engineering pipeline
│   ├── train.py                # Isolation Forest training
│   ├── evaluate.py             # Post-hoc evaluation (ROC, lift)
│   ├── risk_engine.py          # Percentile-based 0-100 scoring
│   ├── explain.py              # SHAP TreeExplainer wrapper
│   ├── ocr_service.py          # Tesseract + regex invoice parser
│   └── data_ingest.py          # ETL pipeline (CSV → SQLite)
├── notebooks/                  # Day-by-day verification notebooks
│   ├── eda_paysim.ipynb
│   ├── day3_feature_verification.ipynb
│   ├── day4_model_training.ipynb
│   ├── day5_evaluation.ipynb
│   ├── day6_lof_comparison.ipynb
│   ├── day7_risk_engine.ipynb
│   ├── day8_shap_explainability.ipynb
│   └── day9_ocr_service.ipynb
├── saved_models/               # Serialized models
│   ├── isolation_forest_v1.0.0.joblib
│   └── risk_engine_v1.0.0.joblib
├── tests/                      # pytest suite
│   ├── test_train.py
│   └── test_evaluate.py
├── docs/                       # Documentation assets
├── .env.example                # Environment template
├── requirements.txt            # Python dependencies
├── render.yaml                 # Render deployment config
└── README.md                   # This file
```

---

## 📸 Screenshots

> _Screenshots will be added upon project completion. See [docs/](docs/) for current assets._

### Planned Screenshots

| Screen | Description |
|--------|-------------|
| **Dashboard** | KPI cards, anomaly trend chart, risk distribution donut |
| **Upload** | Drag-and-drop CSV upload with progress simulation |
| **Transactions** | Filterable data table with detail drawer |
| **Explainability** | SHAP waterfall chart + feature importance |
| **Analytics** | ROC curve, lift chart, fraud type breakdown |
| **Settings** | API config, theme selector, danger zone |

---

## 🎤 Interview Talking Points

### The 90-Second Pitch

> "I built LedgerWatch AI, a full-stack fraud detection platform. It ingests transaction CSVs and invoice PDFs, trains an Isolation Forest on 6.3 million transactions, scores each transaction 0-100 for fraud risk, and explains every score using SHAP. The backend is FastAPI with 7 REST endpoints and API key auth. The frontend is a professional React dashboard with 6 fully functional pages, dark fintech design, drag-and-drop upload, interactive data tables, and SHAP visualizations."

### Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Isolation Forest over LOF** | O(n log n) vs O(n²) — validated with 6.3M rows |
| **Percentile-based risk** | No labels needed during calibration — fully unsupervised |
| **SHAP sign-flipping** | Aligns positive SHAP values with anomaly direction |
| **SQLite over Postgres** | Zero-config, interview-appropriate, portable |
| **Tailwind CSS v4** | CSS-first config, no tailwind.config.js needed |

### What I Fixed (Code Quality)

After building the initial backend, I did a comprehensive code review that uncovered 16 issues:

- Fixed RiskEngine loading crash (dict vs object formats)
- Added database auto-creation for fresh deploys
- Cached SHAP TreeExplainer for 10× faster explanations
- Added missing `/stats` and `/transactions/{id}` endpoints
- Fixed ORM serialization for proper JSON responses
- Hardened data ingestion with session-based rollback
- Added file size limits and API key authentication

---

## 🌐 Deployment

### Backend (Render)

1. Connect GitHub repo to Render
2. `render.yaml` auto-configures the service
3. Tesseract installs automatically via `buildCommand`
4. Models deploy from `saved_models/` in repo

**URL:** `https://ledgerwatch-api.onrender.com`

### Frontend (Vercel)

1. Import `frontend/` folder to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`

**URL:** `https://ledgerwatch-ai.vercel.app`

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by Kalpit**
*Electronics Engineering Student*

[⬆ Back to Top](#-ledgerwatch-ai)

</div>
