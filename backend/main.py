"""
backend/main.py — FastAPI backend for LedgerWatch AI
"""

import logging
import os
import time
from contextlib import asynccontextmanager
from io import StringIO

import joblib
import numpy as np
import pandas as pd
import shap
from fastapi import Depends, FastAPI, File, HTTPException, Query, Security, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.config import settings
from src.database import Base, SessionLocal
from src.database import Transaction as DBTransaction
from src.database import engine, get_db
from src.explain import explain_transaction
from src.features import engineer_all_features
from src.ocr_service import InvoiceOCR
from src.risk_engine import RiskEngine
from src.schemas import (
    BatchPredictionResponse,
    HealthResponse,
    OCRExtraction,
    PredictionResult,
    TransactionCreate,
    TransactionRead,
)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)


# ─── Lifespan: Load models on startup ────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models on startup, clean up on shutdown."""
    logger.info("Starting LedgerWatch API...")

    # Create database tables if they don't exist (critical for fresh deploys)
    Base.metadata.create_all(bind=engine)

    # Load Isolation Forest model
    model_path = settings.MODEL_PATH
    if os.path.exists(model_path):
        model_data = joblib.load(model_path)
        if isinstance(model_data, dict) and "model" in model_data:
            app.state.model = model_data["model"]
            app.state.model_metadata = {
                k: v for k, v in model_data.items() if k != "model"
            }
            app.state.expected_features = model_data.get("feature_names", [])
            logger.info(
                f"Model loaded from dict: {model_path}, features: {len(app.state.expected_features)}"
            )
        else:
            app.state.model = model_data
            app.state.model_metadata = {}
            app.state.expected_features = []
            logger.info(f"Model loaded directly: {model_path}")
    else:
        logger.warning(f"Model not found: {model_path}")
        app.state.model = None

    # Load Risk Engine
    risk_path = settings.RISK_ENGINE_PATH
    if os.path.exists(risk_path):
        app.state.risk_engine = RiskEngine.load(risk_path)
        logger.info(f"Risk engine loaded: {risk_path}")
    else:
        logger.warning(f"Risk engine not found: {risk_path}")
        app.state.risk_engine = None

    # Cache SHAP TreeExplainer (expensive to recreate per request)
    if app.state.model is not None:
        app.state.explainer = shap.TreeExplainer(
            app.state.model, feature_perturbation="interventional"
        )
        logger.info("SHAP TreeExplainer cached")
    else:
        app.state.explainer = None

    # Initialize OCR
    try:
        app.state.ocr = InvoiceOCR(mock_mode=False)
        logger.info("OCR initialized (Tesseract mode)")
    except Exception as e:
        logger.warning(f"Tesseract unavailable: {e} — using mock mode")
        app.state.ocr = InvoiceOCR(mock_mode=True)

    yield
    logger.info("Shutting down LedgerWatch API...")


app = FastAPI(
    title="LedgerWatch AI",
    description="OCR-powered financial transaction anomaly detection API",
    version="1.0.0",
    lifespan=lifespan,
)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helper Functions ───────────────────────────────────────────────────────


def get_feature_columns(df: pd.DataFrame):
    """Return feature columns used by the model (exclude raw + metadata)."""
    raw_cols = {
        "step",
        "type",
        "amount",
        "nameOrig",
        "oldbalanceOrg",
        "newbalanceOrig",
        "nameDest",
        "oldbalanceDest",
        "newbalanceDest",
        "isFraud",
        "isFlaggedFraud",
    }
    return [c for c in df.columns if c not in raw_cols]


def engineer_features_from_df(df: pd.DataFrame) -> pd.DataFrame:
    """Wrapper: engineer features from an in-memory DataFrame via temp CSV."""
    import tempfile
    from pathlib import Path

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, newline=""
    ) as tmp:
        df.to_csv(tmp.name, index=False)
        tmp_path = tmp.name

    try:
        features = engineer_all_features(input_path=Path(tmp_path), save=False)
        return features
    finally:
        os.unlink(tmp_path)


def align_features(X: pd.DataFrame, expected_features: list) -> pd.DataFrame:
    """Align feature DataFrame to match model's expected columns."""
    for col in expected_features:
        if col not in X.columns:
            X[col] = 0.0
    return X[expected_features]


def get_risk_band(score: int) -> str:
    """Map risk score to human-readable band."""
    if score >= 95:
        return "Critical"
    elif score >= 85:
        return "High"
    elif score >= 60:
        return "Elevated"
    elif score >= 30:
        return "Medium"
    else:
        return "Low"


def predict_single(
    df: pd.DataFrame,
    model,
    risk_engine,
    expected_features: list,
    explainer=None,
    explain: bool = False,
):
    """Run prediction pipeline on a single-row DataFrame."""
    start = time.time()

    features = engineer_features_from_df(df)
    feature_cols = get_feature_columns(features)
    X = features[feature_cols]

    X_aligned = align_features(X, expected_features)

    anomaly_score = float(model.score_samples(X_aligned)[0])
    is_anomaly = model.predict(X_aligned)[0] == -1

    risk_score = int(risk_engine.transform([-anomaly_score])[0])
    risk_band = get_risk_band(risk_score)

    shap_vals = None
    top_feats = None
    if explain and explainer is not None:
        try:
            shap_result = explain_transaction(
                model, X_aligned.iloc[0], expected_features, explainer=explainer
            )
            if shap_result and "contributions" in shap_result:
                shap_vals = {
                    c["feature"]: c["shap_value"]
                    for c in shap_result["contributions"][:5]
                }
                top_feats = [c["feature"] for c in shap_result["contributions"][:3]]
        except Exception as e:
            logger.warning(f"SHAP failed: {e}")

    elapsed = (time.time() - start) * 1000

    return {
        "transaction_id": 0,
        "anomaly_score": anomaly_score,
        "risk_score": risk_score,
        "risk_band": risk_band,
        "is_anomaly": is_anomaly,
        "shap_values": shap_vals,
        "top_features": top_feats,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Service health check."""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        model_loaded=app.state.model is not None,
        risk_engine_loaded=app.state.risk_engine is not None,
        ocr_available=not getattr(app.state.ocr, "mock_mode", True),
        timestamp=pd.Timestamp.now().isoformat(),
    )


@app.post(
    "/predict", response_model=PredictionResult, dependencies=[Depends(verify_api_key)]
)
async def predict(
    data: TransactionCreate,
    explain: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    """Predict fraud risk for a single transaction."""
    if app.state.model is None or app.state.risk_engine is None:
        raise HTTPException(status_code=503, detail="Model or risk engine not loaded")

    df = pd.DataFrame([data.model_dump()])
    result = predict_single(
        df,
        app.state.model,
        app.state.risk_engine,
        app.state.expected_features,
        explainer=app.state.explainer,
        explain=explain,
    )

    try:
        db_tx = DBTransaction(**data.model_dump())
        db_tx.is_anomaly = result["is_anomaly"]
        db_tx.risk_band = result["risk_band"]
        db_tx.risk_score = result["risk_score"]
        db.add(db_tx)
        db.commit()
        db.refresh(db_tx)
        result["transaction_id"] = db_tx.id
    except Exception as e:
        logger.warning(f"DB save failed: {e}")
        db.rollback()

    return PredictionResult(**result)


@app.post(
    "/batch-predict",
    response_model=BatchPredictionResponse,
    dependencies=[Depends(verify_api_key)],
)
async def batch_predict(
    file: UploadFile = File(...),
    explain: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    """Bulk prediction from uploaded CSV."""
    if app.state.model is None or app.state.risk_engine is None:
        raise HTTPException(status_code=503, detail="Model or risk engine not loaded")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")

    MAX_BATCH_SIZE = 10 * 1024 * 1024
    contents = await file.read(MAX_BATCH_SIZE + 1)
    if len(contents) > MAX_BATCH_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max 10MB.")

    start = time.time()

    try:
        df = pd.read_csv(StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {e}")

    required = {
        "step",
        "type",
        "amount",
        "nameOrig",
        "oldbalanceOrg",
        "newbalanceOrig",
        "nameDest",
        "oldbalanceDest",
        "newbalanceDest",
    }
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")

    # Batch prediction
    features = engineer_features_from_df(df)
    feature_cols = get_feature_columns(features)
    X = features[feature_cols]
    X_aligned = align_features(X, app.state.expected_features)

    anomaly_scores = app.state.model.score_samples(X_aligned)
    raw_predictions = app.state.model.predict(X_aligned)

    # ─── FIXED RISK SCORING ───────────────────────────────────
    n = len(df)

    # Rank-based risk scores: most anomalous = 100, least = 0
    sorted_indices = np.argsort(anomaly_scores)  # ascending: most anomalous first
    risk_scores = [0] * n
    for rank, idx in enumerate(sorted_indices):
        risk_scores[idx] = int(100 * (1 - rank / max(n - 1, 1)))

    # Risk bands
    risk_bands = [get_risk_band(s) for s in risk_scores]

    # Top 5% = anomaly
    anomaly_threshold_idx = int(n * 0.05)
    is_anomalies = [False] * n
    for idx in sorted_indices[:anomaly_threshold_idx]:
        is_anomalies[idx] = True
    # ───────────────────────────────────────────────────────────

    results = []
    for i in range(len(df)):
        results.append(
            PredictionResult(
                transaction_id=i,
                anomaly_score=float(anomaly_scores[i]),
                risk_score=risk_scores[i],
                risk_band=risk_bands[i],
                is_anomaly=is_anomalies[i],
                shap_values=None,
                top_features=None,
            )
        )

    anomalies_detected = sum(1 for r in results if r.is_anomaly)

    # ─── SAVE TO DATABASE ─────────────────────────────────────
    for i, row in df.iterrows():
        db_tx = DBTransaction(
            step=int(row["step"]),
            type=str(row["type"]),
            amount=float(row["amount"]),
            nameOrig=str(row["nameOrig"]),
            oldbalanceOrg=float(row["oldbalanceOrg"]),
            newbalanceOrig=float(row["newbalanceOrig"]),
            nameDest=str(row["nameDest"]),
            oldbalanceDest=float(row["oldbalanceDest"]),
            newbalanceDest=float(row["newbalanceDest"]),
            is_anomaly=is_anomalies[i],
            risk_band=risk_bands[i],
            risk_score=risk_scores[i],
            isFraud=None,
            isFlaggedFraud=None,
        )
        db.add(db_tx)

    db.commit()
    # ───────────────────────────────────────────────────────────

    return BatchPredictionResponse(
        total_processed=len(df),
        anomalies_detected=anomalies_detected,
        results=results,
    )


@app.post("/ocr", dependencies=[Depends(verify_api_key)])
async def ocr_parse(file: UploadFile = File(...)):
    """Parse invoice PDF or image into structured data."""
    ocr = app.state.ocr

    ext = file.filename.lower().split(".")[-1]
    if ext not in ["pdf", "png", "jpg", "jpeg", "tiff", "tif"]:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    import tempfile

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        if ext == "pdf":
            result = ocr.parse_invoice(tmp_path)
        else:
            result = ocr.parse_image(tmp_path)

        return {
            "raw_text": result.raw_text[:500],
            "amount": result.amount,
            "date": result.date,
            "vendor": result.vendor,
            "confidence": result.confidence,
            "validation_errors": result.metadata.get("fields_missing", []),
        }
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {e}")
    finally:
        os.unlink(tmp_path)


@app.get("/transactions", dependencies=[Depends(verify_api_key)])
async def get_transactions(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Query transaction history."""
    txs = db.query(DBTransaction).offset(offset).limit(limit).all()
    total_count = db.query(func.count(DBTransaction.id)).scalar()
    return {
        "transactions": [TransactionRead.model_validate(tx) for tx in txs],
        "count": total_count or 0,
    }


@app.get("/transactions/{transaction_id}", dependencies=[Depends(verify_api_key)])
async def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
):
    """Get a single transaction by ID."""
    tx = db.query(DBTransaction).filter(DBTransaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return TransactionRead.model_validate(tx)


@app.get("/stats", dependencies=[Depends(verify_api_key)])
async def get_stats(db: Session = Depends(get_db)):
    """Dashboard statistics."""
    total = db.query(func.count(DBTransaction.id)).scalar()

    try:
        anomalies = (
            db.query(func.count(DBTransaction.id))
            .filter(DBTransaction.is_anomaly == True)
            .scalar()
        )
    except Exception:
        anomalies = 0

    try:
        critical = (
            db.query(func.count(DBTransaction.id))
            .filter(DBTransaction.risk_band == "Critical")
            .scalar()
        )
    except Exception:
        critical = 0

    try:
        high = (
            db.query(func.count(DBTransaction.id))
            .filter(DBTransaction.risk_band == "High")
            .scalar()
        )
    except Exception:
        high = 0

    try:
        elevated = (
            db.query(func.count(DBTransaction.id))
            .filter(DBTransaction.risk_band == "Elevated")
            .scalar()
        )
    except Exception:
        elevated = 0

    try:
        medium = (
            db.query(func.count(DBTransaction.id))
            .filter(DBTransaction.risk_band == "Medium")
            .scalar()
        )
    except Exception:
        medium = 0

    try:
        low = (
            db.query(func.count(DBTransaction.id))
            .filter(DBTransaction.risk_band == "Low")
            .scalar()
        )
    except Exception:
        low = 0

    try:
        avg_risk = db.query(func.avg(DBTransaction.risk_score)).scalar()
    except Exception:
        avg_risk = 0.0

    return {
        "total_transactions": total or 0,
        "anomalies_detected": anomalies or 0,
        "critical_count": critical or 0,
        "high_count": high or 0,
        "elevated_count": elevated or 0,
        "medium_count": medium or 0,
        "low_count": low or 0,
        "anomaly_rate": round(anomalies / total, 4) if total else 0.0,
        "avg_risk_score": round(float(avg_risk), 1) if avg_risk else 0.0,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
