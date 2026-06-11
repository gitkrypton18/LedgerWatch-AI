# LedgerWatch AI — Architecture Decisions

## Day 0: Project Setup

### Dataset: PaySim
- **Why:** Synthetic financial transactions with fraud labels
- **Labels used for:** Validation only, not training
- **Source:** Kaggle

### Model: Isolation Forest (Primary)
- **Why:** Fast, scalable, SHAP-compatible
- **Comparison:** LOF in notebook only (no SHAP, doesn't scale)

### Database: SQLite
- **Why:** Zero setup, single file, SQLAlchemy migration path
- **Future:** PostgreSQL with one line change

### OCR: Tesseract
- **Why:** Free, offline, recruiter-friendly
- **Scope:** Fixed template, one sample invoice
- **Future:** LayoutLM for arbitrary layouts

### Deployment: Render + Streamlit Cloud
- **Why:** Free tier, GitHub integration, no DevOps complexity

### Config: `.env` + `config.py`
- **Why:** Environment-aware design, no hardcoded paths
- **Interview talking point:** "I never hardcode secrets or paths"
