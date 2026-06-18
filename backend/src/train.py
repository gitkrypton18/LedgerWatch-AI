"""
LedgerWatch AI — Day 4: Model Training Pipeline
================================================
Train Isolation Forest on engineered features.
Honest unsupervised approach: labels NEVER used during training.

Usage:
    python src/train.py                    # Full training with default paths
    python src/train.py --sample 100000    # Train on sample for quick test
    python src/train.py --validate         # Run post-hoc validation with labels

Output:
    saved_models/isolation_forest_v1.0.0.joblib
"""

import argparse
import logging
import sys
import warnings
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split

# Add project root to path for imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.config import settings

# ──────────────────────────────────────────────────────────────────────────────
# Logging setup
# ──────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("train")

# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────
FEATURE_COLS = [
    # Amount features (3)
    "amount_log",
    "is_round_amount",
    "amount_to_balance_ratio",
    # Balance features (6)
    "balance_diff_orig",
    "balance_diff_dest",
    "balance_change_orig",
    "balance_change_dest",
    "zero_balance_orig",
    "zero_balance_dest",
    # Temporal features (3)
    "hour_of_step",
    "hour_of_step_sin",
    "hour_of_step_cos",
    # Categorical features (6)
    "type_encoded",
    "type_CASH_IN",
    "type_CASH_OUT",
    "type_DEBIT",
    "type_PAYMENT",
    "type_TRANSFER",
    # Frequency features (4)
    "freq_orig",
    "freq_dest",
    "is_new_orig",
    "is_new_dest",
    # Merchant features (2)
    "is_merchant_orig",
    "is_merchant_dest",
]

LABEL_COL = "isFraud"
DROP_COLS = [LABEL_COL, "isFlaggedFraud"]  # Never used for training

# ──────────────────────────────────────────────────────────────────────────────
# Data Loading
# ──────────────────────────────────────────────────────────────────────────────


def load_features(
    path: Path | None = None, max_rows: int | None = None
) -> pd.DataFrame:
    """Load engineered features from CSV."""
    path = path or settings.PROCESSED_DATA_PATH
    logger.info(f"Loading features from {path}")

    if not Path(path).exists():
        raise FileNotFoundError(f"Features file not found: {path}")

    df = pd.read_csv(path, nrows=max_rows, low_memory=False)
    logger.info(f"Loaded {len(df):,} rows × {len(df.columns)} columns")
    return df


# ──────────────────────────────────────────────────────────────────────────────
# Train / Test Split (unsupervised — no stratification needed)
# ──────────────────────────────────────────────────────────────────────────────


def split_data(
    df: pd.DataFrame,
    test_size: float = 0.2,
    random_state: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split into train/test features. Labels are kept alongside but NOT used for fitting.
    Returns: X_train, X_test, y_train, y_test (labels for post-hoc validation only)
    """
    # Separate features and labels (labels dropped from X, kept in y for validation)
    X = df[FEATURE_COLS].copy()
    y = (
        df[LABEL_COL].copy()
        if LABEL_COL in df.columns
        else pd.Series(index=df.index, dtype=int)
    )

    # Validate no leakage
    assert LABEL_COL not in X.columns, "CRITICAL: label column leaked into features!"

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, shuffle=True
    )

    logger.info(f"Train set: {len(X_train):,} rows")
    logger.info(f"Test set:  {len(X_test):,} rows")
    return X_train, X_test, y_train, y_test


# ──────────────────────────────────────────────────────────────────────────────
# Model Training
# ──────────────────────────────────────────────────────────────────────────────


def build_model(
    contamination: float = 0.01,
    n_estimators: int = 200,
    max_samples: str | int = "auto",
    max_features: float = 1.0,
    bootstrap: bool = False,
    random_state: int = 42,
    n_jobs: int = -1,
) -> IsolationForest:
    """
    Build Isolation Forest with locked hyperparameters.

    Why these settings:
    - contamination=0.01: matches expected fraud rate (from .env)
    - n_estimators=200: stable scores, faster than 500 with minimal gain
    - max_samples="auto": min(256, n_samples) — good for large datasets
    - max_features=1.0: use all features (we engineered them intentionally)
    - bootstrap=False: subsample without replacement (less variance)
    """
    model = IsolationForest(
        contamination=contamination,
        n_estimators=n_estimators,
        max_samples=max_samples,
        max_features=max_features,
        bootstrap=bootstrap,
        random_state=random_state,
        n_jobs=n_jobs,
        verbose=1,
    )
    logger.info(
        f"Model config: contamination={contamination}, n_estimators={n_estimators}"
    )
    return model


def train_model(model: IsolationForest, X_train: pd.DataFrame) -> IsolationForest:
    """Fit Isolation Forest on training features (unsupervised)."""
    logger.info("Fitting Isolation Forest...")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # Suppress sklearn convergence noise
        model.fit(X_train)
    logger.info("Training complete")
    return model


# ──────────────────────────────────────────────────────────────────────────────
# Model Persistence
# ──────────────────────────────────────────────────────────────────────────────


def save_model(model: IsolationForest, path: Path | None = None) -> Path:
    """Save trained model with joblib (fast, preserves sklearn internals)."""
    path = path or settings.MODEL_PATH
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    # Save model + metadata bundle
    bundle = {
        "model": model,
        "feature_names": FEATURE_COLS,
        "version": "1.0.0",
        "contamination": model.contamination,
        "n_estimators": model.n_estimators,
        "random_state": model.random_state,
    }

    joblib.dump(bundle, path)
    logger.info(f"Model saved to {path} ({path.stat().st_size / 1024 / 1024:.1f} MB)")
    return path


def load_model(path: Path | None = None) -> dict[str, Any]:
    """Load model bundle."""
    path = path or settings.MODEL_PATH
    bundle = joblib.load(path)
    logger.info(f"Model loaded from {path}")
    return bundle


# ──────────────────────────────────────────────────────────────────────────────
# Post-Hoc Validation (uses labels ONLY for reporting, NEVER for training)
# ──────────────────────────────────────────────────────────────────────────────


def validate_model(
    model: IsolationForest,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    contamination: float = 0.01,
) -> dict[str, Any]:
    """
    Evaluate model performance using held-out labels.
    This is post-hoc validation — labels were NOT used during training.
    """
    from sklearn.metrics import (
        accuracy_score,
        classification_report,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
        roc_auc_score,
    )

    # Predict: -1 = anomaly, 1 = normal  →  convert to 1 = fraud, 0 = normal
    y_pred_raw = model.predict(X_test)
    y_pred = np.where(y_pred_raw == -1, 1, 0)

    # Anomaly scores (lower = more anomalous)
    anomaly_scores = model.decision_function(X_test)

    # Metrics
    metrics = {
        "n_test": len(X_test),
        "n_predicted_anomalies": int(y_pred.sum()),
        "predicted_anomaly_rate": float(y_pred.mean()),
        "n_actual_frauds": int(y_test.sum()),
        "actual_fraud_rate": float(y_test.mean()),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, -anomaly_scores)),
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
    }

    logger.info("─" * 50)
    logger.info("POST-HOC VALIDATION RESULTS (labels NOT used in training)")
    logger.info("─" * 50)
    logger.info(f"Test samples:        {metrics['n_test']:,}")
    logger.info(
        f"Predicted anomalies: {metrics['n_predicted_anomalies']:,} ({metrics['predicted_anomaly_rate']:.3%})"
    )
    logger.info(
        f"Actual frauds:       {metrics['n_actual_frauds']:,} ({metrics['actual_fraud_rate']:.3%})"
    )
    logger.info(f"Precision:           {metrics['precision']:.4f}")
    logger.info(f"Recall:              {metrics['recall']:.4f}")
    logger.info(f"F1-Score:            {metrics['f1']:.4f}")
    logger.info(f"ROC-AUC:             {metrics['roc_auc']:.4f}")
    logger.info(f"Accuracy:            {metrics['accuracy']:.4f}")
    logger.info(f"Confusion Matrix:    {metrics['confusion_matrix']}")
    logger.info("─" * 50)

    return metrics


# ──────────────────────────────────────────────────────────────────────────────
# Full Pipeline Orchestrator
# ──────────────────────────────────────────────────────────────────────────────


def train_pipeline(
    features_path: Path | None = None,
    model_path: Path | None = None,
    max_rows: int | None = None,
    validate: bool = True,
) -> dict[str, Any]:
    """
    End-to-end training pipeline.

    Steps:
        1. Load engineered features
        2. Train/test split (unsupervised — random, no stratification)
        3. Build Isolation Forest
        4. Fit on training data
        5. Save model bundle
        6. Post-hoc validation with labels
    """
    logger.info("=" * 60)
    logger.info("LedgerWatch AI — Day 4: Model Training Pipeline")
    logger.info("=" * 60)

    # 1. Load
    df = load_features(features_path, max_rows=max_rows)

    # 2. Split
    X_train, X_test, y_train, y_test = split_data(
        df,
        test_size=settings.TEST_SIZE,
        random_state=settings.RANDOM_STATE,
    )

    # 3. Build
    model = build_model(
        contamination=settings.CONTAMINATION,
        n_estimators=settings.N_ESTIMATORS,
        max_samples=settings.MAX_SAMPLES,
        max_features=settings.MAX_FEATURES,
        bootstrap=settings.BOOTSTRAP,
        random_state=settings.RANDOM_STATE,
        n_jobs=settings.N_JOBS,
    )

    # 4. Train
    model = train_model(model, X_train)

    # 5. Save
    saved_path = save_model(model, model_path)

    # 6. Validate
    metrics = {}
    if validate and LABEL_COL in df.columns:
        metrics = validate_model(
            model, X_test, y_test, contamination=settings.CONTAMINATION
        )
    else:
        logger.info("Skipping validation (no labels available or validate=False)")

    result = {
        "status": "success",
        "model_path": str(saved_path),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "features_used": FEATURE_COLS,
        "metrics": metrics,
    }

    logger.info("Training pipeline complete ✅")
    return result


# ──────────────────────────────────────────────────────────────────────────────
# CLI Entry Point
# ──────────────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="LedgerWatch AI Model Training")
    parser.add_argument(
        "--sample", type=int, default=None, help="Train on N rows (for quick test)"
    )
    parser.add_argument(
        "--no-validate", action="store_true", help="Skip post-hoc validation"
    )
    parser.add_argument(
        "--features-path", type=str, default=None, help="Override features CSV path"
    )
    parser.add_argument(
        "--model-path", type=str, default=None, help="Override model output path"
    )
    args = parser.parse_args()

    result = train_pipeline(
        features_path=Path(args.features_path) if args.features_path else None,
        model_path=Path(args.model_path) if args.model_path else None,
        max_rows=args.sample,
        validate=not args.no_validate,
    )
    print(f"\nModel saved: {result['model_path']}")


if __name__ == "__main__":
    main()
