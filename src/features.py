"""
src/features.py — Feature Engineering Pipeline for LedgerWatch AI

Day 3: Feature Engineering
==========================
Engineers 16 features from cleaned PaySim data based on EDA insights.
All features are computable on NEW transactions (no future leakage).
Labels (isFraud) are NEVER used during feature engineering.

Input:  data/processed/cleaned.csv  (6.3M rows, 11 cols)
Output: data/processed/features.csv (6.3M rows, 27 cols)

Features:
---------
1.  amount_log              — Log-transformed amount
2.  is_round_amount         — Round amount flag
3.  amount_to_balance_ratio — Sender liquidity stress
4.  balance_diff_orig       — Origin balance anomaly magnitude
5.  balance_diff_dest       — Destination balance anomaly magnitude
6.  balance_change_orig     — Signed origin balance change
7.  balance_change_dest     — Signed destination balance change
8.  zero_balance_orig       — Sender emptied account
9.  zero_balance_dest       — Recipient started at zero
10. hour_of_step            — Hour of day (0-23)
11. hour_of_step_sin        — Cyclical encoding (sin)
12. hour_of_step_cos        — Cyclical encoding (cos)
13. type_encoded            — Ordinal by fraud risk
14. type_CASH_IN            — One-hot dummy
15. type_CASH_OUT           — One-hot dummy
16. type_DEBIT              — One-hot dummy
17. type_PAYMENT            — One-hot dummy
18. type_TRANSFER           — One-hot dummy
19. freq_orig               — Expanding count per sender
20. freq_dest               — Expanding count per recipient
21. is_new_orig             — First transaction for sender
22. is_new_dest             — First transaction for recipient
23. is_merchant_orig        — Sender is merchant
24. is_merchant_dest        — Recipient is merchant

Author: Kalpit
Date: June 12, 2026
"""

import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CLEANED_PATH = PROJECT_ROOT / "data" / "processed" / "cleaned.csv"
FEATURES_PATH = PROJECT_ROOT / "data" / "processed" / "features.csv"


def engineer_amount_features(df: pd.DataFrame) -> pd.DataFrame:
    """Amount-based features: log transform, round flag, liquidity ratio."""
    df = df.copy()  # ✅ FIX: Prevent SettingWithCopyWarning
    df["amount_log"] = np.log1p(df["amount"])
    df["is_round_amount"] = (df["amount"] % 1.0 == 0).astype(int)
    # ✅ FIX: Use vectorized np.where instead of apply
    df["amount_to_balance_ratio"] = np.where(
        df["oldbalanceOrg"] > 0,
        df["amount"] / df["oldbalanceOrg"],
        df["amount"],  # If zero balance, ratio = amount itself
    )
    ratio_cap = df["amount_to_balance_ratio"].quantile(0.999)
    df["amount_to_balance_ratio"] = df["amount_to_balance_ratio"].clip(upper=ratio_cap)
    return df


def engineer_balance_features(df: pd.DataFrame) -> pd.DataFrame:
    """Balance-based features: diff magnitudes, changes, zero flags."""
    df = df.copy()  # ✅ FIX: Prevent SettingWithCopyWarning
    df["balance_diff_orig"] = (
        df["oldbalanceOrg"] - df["newbalanceOrig"] - df["amount"]
    ).abs()
    df["balance_diff_dest"] = (
        df["oldbalanceDest"] - df["newbalanceDest"] + df["amount"]
    ).abs()
    df["balance_change_orig"] = df["newbalanceOrig"] - df["oldbalanceOrg"]
    df["balance_change_dest"] = df["newbalanceDest"] - df["oldbalanceDest"]
    df["zero_balance_orig"] = (df["newbalanceOrig"] == 0).astype(int)
    df["zero_balance_dest"] = (df["oldbalanceDest"] == 0).astype(int)
    return df


def engineer_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """Temporal features: hour extraction + cyclical sin/cos encoding."""
    df = df.copy()  # ✅ FIX: Prevent SettingWithCopyWarning
    df["hour_of_step"] = (df["step"] - 1) % 24
    df["hour_of_step_sin"] = np.sin(2 * np.pi * df["hour_of_step"] / 24)
    df["hour_of_step_cos"] = np.cos(2 * np.pi * df["hour_of_step"] / 24)
    return df


def engineer_categorical_features(df: pd.DataFrame) -> pd.DataFrame:
    """Categorical features: ordinal encoding + one-hot dummies."""
    df = df.copy()  # ✅ FIX: Prevent SettingWithCopyWarning
    type_risk_map = {
        "TRANSFER": 4,
        "CASH_OUT": 3,
        "PAYMENT": 2,
        "CASH_IN": 1,
        "DEBIT": 0,
    }
    df["type_encoded"] = df["type"].map(type_risk_map).fillna(2.0)
    type_dummies = pd.get_dummies(df["type"], prefix="type", dtype=int)
    df = pd.concat([df, type_dummies], axis=1)
    return df


def engineer_frequency_features(df: pd.DataFrame) -> pd.DataFrame:
    """Frequency features: EXPANDING count (no data leakage)."""
    df = df.copy()  # ✅ FIX: Prevent SettingWithCopyWarning
    df = df.sort_values("step").reset_index(drop=True)
    df["freq_orig"] = df.groupby("nameOrig").cumcount()
    df["freq_dest"] = df.groupby("nameDest").cumcount()
    df["is_new_orig"] = (df["freq_orig"] == 0).astype(int)
    df["is_new_dest"] = (df["freq_dest"] == 0).astype(int)
    return df


def engineer_merchant_features(df: pd.DataFrame) -> pd.DataFrame:
    """Merchant features: C=customer, M=merchant prefix flags."""
    df = df.copy()  # ✅ FIX: Prevent SettingWithCopyWarning
    df["is_merchant_orig"] = df["nameOrig"].str.startswith("M").astype(int)
    df["is_merchant_dest"] = df["nameDest"].str.startswith("M").astype(int)
    return df


def engineer_all_features(
    input_path: Optional[Path] = None,
    output_path: Optional[Path] = None,
    save: bool = True,
) -> pd.DataFrame:
    """Main pipeline: load -> engineer -> validate -> save."""
    input_path = input_path or CLEANED_PATH
    output_path = output_path or FEATURES_PATH

    logger.info("=" * 60)
    logger.info("LEDGERWATCH AI — Feature Engineering Pipeline")
    logger.info("=" * 60)

    logger.info(f"Loading: {input_path}")
    if not input_path.exists():
        raise FileNotFoundError(f"Cleaned data not found at {input_path}")

    df = pd.read_csv(input_path, low_memory=False)
    logger.info(f"Loaded {len(df):,} rows x {len(df.columns)} cols")

    df = engineer_amount_features(df)
    df = engineer_balance_features(df)
    df = engineer_temporal_features(df)
    df = engineer_categorical_features(df)
    df = engineer_frequency_features(df)
    df = engineer_merchant_features(df)

    # Validation
    original_cols = [
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
    ]
    feature_cols = [c for c in df.columns if c not in original_cols]

    df[feature_cols] = df[feature_cols].fillna(0.0)
    assert (
        not np.isinf(df[feature_cols].select_dtypes(include=[np.number])).any().any()
    ), "Infinities found!"
    assert "isFraud" not in feature_cols, "Label leakage detected!"

    if save:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_path, index=False)
        logger.info(
            f"Saved: {output_path} ({output_path.stat().st_size / (1024*1024):.1f} MB)"
        )

    logger.info(
        f"Features: {len(feature_cols)} | Total cols: {len(df.columns)} | Rows: {len(df):,}"
    )
    return df


if __name__ == "__main__":
    engineer_all_features()
