"""
LedgerWatch AI — Retraining Pipeline
====================================
Retrain Isolation Forest on accumulated DB data.
Versioned model saves with rollback capability.

Usage:
    python src/retrain.py                    # Manual retrain with default settings
    python src/retrain.py --max-rows 100000  # Train on sample only
    python src/retrain.py --dry-run          # Train but don't save
"""

import argparse
import logging
import os
import sys
import warnings
from datetime import datetime
from pathlib import Path
from typing import Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.config import settings
from src.database import SessionLocal
from src.database import Transaction as DBTransaction
from src.features import engineer_all_features
from src.risk_engine import RiskEngine

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("retrain")


def get_next_version() -> str:
    """Auto-increment version: v1.0.0 -> v1.0.1 -> v1.0.2"""
    current = getattr(settings, "MODEL_VERSION", "v1.0.0")
    parts = current.replace("v", "").split(".")
    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
    patch += 1
    return f"v{major}.{minor}.{patch}"


def fetch_all_data(db, limit: int = None) -> pd.DataFrame:
    """Fetch transactions from DB with optional limit."""
    logger.info("Fetching transactions from database...")

    query = db.query(DBTransaction)
    if limit:
        query = query.limit(limit)

    txs = query.all()

    if not txs:
        logger.warning("No transactions in DB!")
        return pd.DataFrame()

    data = []
    for tx in txs:
        is_fraud_val = tx.isFraud
        # Infer isFraud from analyst feedback if available
        if is_fraud_val is None and tx.feedback_correct is not None:
            if tx.is_anomaly:
                is_fraud_val = 1 if tx.feedback_correct else 0
            else:
                is_fraud_val = 0 if tx.feedback_correct else 1

        data.append(
            {
                "step": tx.step,
                "type": tx.type,
                "amount": tx.amount,
                "nameOrig": tx.nameOrig,
                "oldbalanceOrg": tx.oldbalanceOrg,
                "newbalanceOrig": tx.newbalanceOrig,
                "nameDest": tx.nameDest,
                "oldbalanceDest": tx.oldbalanceDest,
                "newbalanceDest": tx.newbalanceDest,
                "isFraud": is_fraud_val,
                "isFlaggedFraud": tx.isFlaggedFraud,
            }
        )

    df = pd.DataFrame(data)
    logger.info(f"Fetched {len(df)} transactions from DB")
    return df


def fetch_original_data(sample_size: int = None) -> pd.DataFrame:
    """Fetch original training data with optional sampling. Must be raw data, not features."""
    possible_paths = [
        Path(getattr(settings, "PROCESSED_DATA_PATH", "data/processed/cleaned.csv")),
        Path("data/processed/cleaned.csv"),
        Path("backend/data/processed/cleaned.csv"),
        Path("data/processed/cleaned_sample.csv"),
        Path("backend/data/processed/cleaned_sample.csv"),
        Path("data/sample.csv"),
        Path("backend/data/sample.csv")
    ]
    
    for path in possible_paths:
        if path.exists() and path.is_file():
            logger.info(f"Loading baseline training data from: {path}")
            try:
                if sample_size:
                    return pd.read_csv(path, nrows=sample_size)
                return pd.read_csv(path)
            except Exception as e:
                logger.error(f"Failed to read dataset from {path}: {e}")
                
    logger.warning("Original baseline training data not found in any standard path")
    return pd.DataFrame()


def basic_feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """
    Fallback feature engineering when engineer_all_features fails.
    Creates basic features without rolling windows (memory efficient).
    """
    logger.info("Using basic feature engineering (fallback)...")

    df = df.copy()

    # Amount features
    df["amount_log"] = np.log1p(df["amount"])
    df["is_round_amount"] = (df["amount"] % 100 == 0).astype(int)

    # Balance features
    df["balance_diff_orig"] = df["oldbalanceOrg"] - df["newbalanceOrig"]
    df["balance_diff_dest"] = df["newbalanceDest"] - df["oldbalanceDest"]
    df["balance_change_orig"] = df["newbalanceOrig"] - df["oldbalanceOrg"]
    df["balance_change_dest"] = df["newbalanceDest"] - df["oldbalanceDest"]
    df["zero_balance_orig"] = (df["newbalanceOrig"] == 0).astype(int)
    df["zero_balance_dest"] = (df["newbalanceDest"] == 0).astype(int)

    # Temporal features
    df["hour_of_step"] = df["step"] % 24
    df["hour_of_step_sin"] = np.sin(2 * np.pi * df["hour_of_step"] / 24)
    df["hour_of_step_cos"] = np.cos(2 * np.pi * df["hour_of_step"] / 24)

    # Categorical features
    type_dummies = pd.get_dummies(df["type"], prefix="type")
    df = pd.concat([df, type_dummies], axis=1)

    # Merchant features
    df["is_merchant_orig"] = df["nameOrig"].str.startswith("M").astype(int)
    df["is_merchant_dest"] = df["nameDest"].str.startswith("M").astype(int)

    # Frequency features (simple count per account)
    df["freq_orig"] = df.groupby("nameOrig")["nameOrig"].transform("count")
    df["freq_dest"] = df.groupby("nameDest")["nameDest"].transform("count")

    # New account flag
    df["is_new_orig"] = (df["oldbalanceOrg"] == 0).astype(int)
    df["is_new_dest"] = (df["oldbalanceDest"] == 0).astype(int)

    # Amount to balance ratio
    df["amount_to_balance_ratio"] = df["amount"] / (df["oldbalanceOrg"] + 1)

    # Fill NaNs
    df = df.fillna(0.0)

    # Replace infinities
    df = df.replace([np.inf, -np.inf], 0.0)

    logger.info(f"Basic features created: {len(df.columns)} columns")
    return df


def update_env_file(model_path: str, risk_path: str):
    """Programmatically update MODEL_PATH and RISK_ENGINE_PATH in the .env file."""
    env_path = Path(".env")
    if not env_path.exists():
        # Fall back if run from backend/src or backend/ subdirectory
        env_path = Path("backend") / ".env"
    if not env_path.exists():
        env_path = Path(__file__).resolve().parent.parent / ".env"
        
    if env_path.exists():
        try:
            content = env_path.read_text()
            lines = content.splitlines()
            new_lines = []
            for line in lines:
                if line.startswith("MODEL_PATH="):
                    new_lines.append(f"MODEL_PATH={model_path}")
                elif line.startswith("RISK_ENGINE_PATH="):
                    new_lines.append(f"RISK_ENGINE_PATH={risk_path}")
                else:
                    new_lines.append(line)
            env_path.write_text("\n".join(new_lines) + "\n")
            logger.info("Updated .env file with new paths")
        except Exception as e:
            logger.warning(f"Failed to update .env file: {e}")


def retrain_model(
    contamination: float = None,
    n_estimators: int = None,
    max_samples: str = None,
    random_state: int = None,
    max_rows: int = 500000,  # Limit rows for memory efficiency
    dry_run: bool = False,
) -> Tuple[IsolationForest, RiskEngine, str, bool, float, float, bool]:
    """
    Retrain Isolation Forest on sampled data and evaluate against current primary model.

    Args:
        max_rows: Maximum rows to use for training (default 500K)
        dry_run: If True, train but don't save model

    Returns:
        (model, risk_engine, version_string, promoted, candidate_auc, current_auc, has_labels)
    """
    from sklearn.metrics import roc_auc_score
    from sklearn.model_selection import train_test_split

    db = SessionLocal()
    try:
        # 1. Fetch data (LIMITED for memory efficiency)
        db_data = fetch_all_data(db, limit=max_rows)
        original_data = fetch_original_data(sample_size=max_rows)

        # Combine
        if not original_data.empty:
            logger.info("Combining DB data with original training data...")
            combined = pd.concat([db_data, original_data], ignore_index=True)
            combined = combined.drop_duplicates(
                subset=["step", "nameOrig", "nameDest", "amount"]
            )
        else:
            combined = db_data

        if combined.empty:
            raise ValueError("No data available for retraining!")

        # Sample if still too large
        if len(combined) > max_rows:
            logger.info(f"Sampling {max_rows} rows from {len(combined)} total")
            combined = combined.sample(n=max_rows, random_state=42)

        logger.info(f"Total transactions for training: {len(combined)}")

        # 2. Feature engineering
        import tempfile

        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp:
            combined.to_csv(tmp.name, index=False)
            tmp_path = tmp.name

        try:
            # Try full feature engineering
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                features = engineer_all_features(input_path=Path(tmp_path), save=False)
            logger.info(
                f"Full feature engineering successful: {len(features.columns)} columns"
            )
        except Exception as e:
            logger.error(f"Full feature engineering failed: {e}")
            logger.info("Falling back to basic feature engineering...")
            # Fallback: basic features
            df = pd.read_csv(tmp_path)
            features = basic_feature_engineering(df)
        finally:
            os.unlink(tmp_path)

        # Get feature columns
        feature_cols = [
            c
            for c in features.columns
            if c
            not in {
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
        ]

        # Ensure no NaNs or Infs
        features = features.fillna(0.0)
        features = features.replace([np.inf, -np.inf], 0.0)

        # 3. Train-test split for validation & champion-challenger comparison
        y = features["isFraud"] if "isFraud" in features.columns else pd.Series(np.zeros(len(features)))
        y = y.fillna(0).astype(int)

        stratify_y = y.values if len(np.unique(y)) > 1 else None

        train_idx, val_idx = train_test_split(
            np.arange(len(features)),
            test_size=0.2,
            random_state=42,
            stratify=stratify_y
        )

        train_features = features.iloc[train_idx]
        val_features = features.iloc[val_idx]

        X_train = train_features[feature_cols]
        logger.info(f"Training feature matrix: {X_train.shape}")

        # 4. Train Isolation Forest Candidate
        contamination = contamination or float(
            getattr(settings, "CONTAMINATION", 0.0013)
        )
        n_estimators = n_estimators or getattr(settings, "N_ESTIMATORS", 200)
        max_samples = max_samples or getattr(settings, "MAX_SAMPLES", "auto")
        random_state = random_state or getattr(settings, "RANDOM_STATE", 42)

        if len(X_train) < 5:
            raise ValueError("Insufficient transaction records for retraining. Please upload or generate at least 5 transactions in the database first.")

        logger.info(
            f"Training Isolation Forest Candidate: n_estimators={n_estimators}, contamination={contamination}, samples={len(X_train)}"
        )
        model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            max_samples=max_samples,
            random_state=random_state,
            n_jobs=-1,
            bootstrap=False,
        )
        model.fit(X_train)

        # 5. Create Candidate Risk Engine
        scores = model.score_samples(X_train)
        risk_engine = RiskEngine(percentile_bins=100)
        risk_engine.fit(-scores)  # Negate: higher score = more anomalous

        # 6. Evaluation and Champion-Challenger check
        X_val = val_features[feature_cols]
        y_val = val_features["isFraud"].fillna(0).astype(int).values

        # Candidate scores on validation split
        candidate_scores = -model.decision_function(X_val)

        # Load and score current model for comparison
        current_model = None
        current_feature_names = []
        if os.path.exists(settings.MODEL_PATH):
            try:
                current_data = joblib.load(settings.MODEL_PATH)
                if isinstance(current_data, dict) and "model" in current_data:
                    current_model = current_data["model"]
                    current_feature_names = current_data.get("feature_names", [])
                else:
                    current_model = current_data
            except Exception as e:
                logger.warning(f"Could not load current model for comparison: {e}")

        current_scores = None
        if current_model is not None:
            try:
                if current_feature_names:
                    # Filter and align validation features for the current model
                    X_val_current = val_features[[c for c in current_feature_names if c in val_features.columns]].copy()
                    for col in current_feature_names:
                        if col not in X_val_current.columns:
                            X_val_current[col] = 0.0
                    X_val_current = X_val_current[current_feature_names]
                else:
                    X_val_current = X_val
                current_scores = -current_model.decision_function(X_val_current)
            except Exception as e:
                logger.warning(f"Failed to score current model on validation set: {e}")

        candidate_auc = 0.5
        current_auc = 0.5
        has_labels = len(np.unique(y_val)) > 1

        if has_labels:
            try:
                candidate_auc = float(roc_auc_score(y_val, candidate_scores))
                if current_scores is not None:
                    current_auc = float(roc_auc_score(y_val, current_scores))
            except Exception as e:
                logger.warning(f"Failed to calculate AUC comparison: {e}")

        # Champion-Challenger logic: Promote candidate if AUC is higher (or equal), or if no current model exists
        promoted = True
        if current_scores is not None and has_labels:
            promoted = candidate_auc >= current_auc

        # 7. Save with new version (unless dry_run)
        version = get_next_version()

        if not dry_run:
            model_filename = f"isolation_forest_{version}.joblib"
            risk_filename = f"risk_engine_{version}.joblib"

            model_path = Path("saved_models") / model_filename
            risk_path = Path("saved_models") / risk_filename

            # Ensure directory exists
            model_path.parent.mkdir(parents=True, exist_ok=True)

            joblib.dump(
                {
                    "model": model,
                    "feature_names": feature_cols,
                    "version": version,
                    "trained_at": datetime.utcnow().isoformat(),
                    "n_samples": len(X_train),
                    "contamination": contamination,
                    "val_auc": candidate_auc,
                },
                model_path,
            )

            risk_engine.save(str(risk_path))

            logger.info(f"✅ Model saved: {model_path}")
            logger.info(f"✅ Risk engine saved: {risk_path}")

            if promoted:
                # Update persistent environment configuration
                update_env_file(str(model_path.as_posix()), str(risk_path.as_posix()))
                settings.MODEL_PATH = str(model_path.as_posix())
                settings.RISK_ENGINE_PATH = str(risk_path.as_posix())
                logger.info(f"🏆 Promoted Candidate {version} as new primary model (AUC: {candidate_auc:.4f} vs Current AUC: {current_auc:.4f})")
            else:
                logger.info(f"Candidate {version} trained but NOT promoted (AUC: {candidate_auc:.4f} vs Current AUC: {current_auc:.4f})")
        else:
            logger.info(
                f"✅ Dry run complete — model NOT saved (version would be: {version})"
            )

        logger.info(f"✅ Version: {version}")
        logger.info(f"✅ Samples trained: {len(X_train)}")

        return model, risk_engine, version, promoted, candidate_auc, current_auc, has_labels

    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Retrain LedgerWatch AI model")
    parser.add_argument("--contamination", type=float, default=None)
    parser.add_argument("--n-estimators", type=int, default=None)
    parser.add_argument(
        "--max-rows", type=int, default=500000, help="Max rows for training"
    )
    parser.add_argument("--dry-run", action="store_true", help="Train but don't save")
    args = parser.parse_args()

    model, risk_engine, version, promoted, candidate_auc, current_auc, has_labels = retrain_model(
        contamination=args.contamination,
        n_estimators=args.n_estimators,
        max_rows=args.max_rows,
        dry_run=args.dry_run,
    )

    logger.info(f"Retraining complete! Version: {version} | Promoted: {promoted} (New AUC: {candidate_auc:.4f} vs Current: {current_auc:.4f})")
