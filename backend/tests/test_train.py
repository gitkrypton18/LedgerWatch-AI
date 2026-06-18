"""
tests/test_train.py
Unit tests for src/train.py training pipeline.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.train import (
    FEATURE_COLS,
    build_model,
    load_features,
    save_model,
    split_data,
    train_model,
    validate_model,
)


def test_feature_cols_count():
    """Ensure 24 engineered features are defined."""
    assert len(FEATURE_COLS) == 24


def test_build_model_defaults():
    """Model builds with correct hyperparameters."""
    model = build_model(contamination=0.01, n_estimators=50, random_state=42)
    assert model.contamination == 0.01
    assert model.n_estimators == 50
    assert model.random_state == 42


def test_split_data_no_leakage():
    """Labels must NOT leak into feature matrix."""
    df = pd.DataFrame(
        {
            "amount_log": [1.0, 2.0, 3.0, 4.0],
            "is_round_amount": [0, 1, 0, 1],
            "amount_to_balance_ratio": [0.1, 0.2, 0.3, 0.4],
            "balance_diff_orig": [0, 0, 100, 100],
            "balance_diff_dest": [0, 0, 50, 50],
            "balance_change_orig": [-10, -20, 0, 0],
            "balance_change_dest": [10, 20, 0, 0],
            "zero_balance_orig": [1, 1, 0, 0],
            "zero_balance_dest": [0, 0, 1, 1],
            "hour_of_step": [1, 2, 3, 4],
            "hour_of_step_sin": [0.0, 0.5, 0.0, -0.5],
            "hour_of_step_cos": [1.0, 0.5, -1.0, -0.5],
            "type_encoded": [4, 3, 2, 1],
            "type_CASH_IN": [0, 0, 1, 0],
            "type_CASH_OUT": [0, 1, 0, 0],
            "type_DEBIT": [0, 0, 0, 1],
            "type_PAYMENT": [1, 0, 0, 0],
            "type_TRANSFER": [0, 0, 0, 0],
            "freq_orig": [1, 2, 1, 2],
            "freq_dest": [1, 1, 2, 2],
            "is_new_orig": [1, 0, 1, 0],
            "is_new_dest": [1, 1, 0, 0],
            "is_merchant_orig": [0, 0, 0, 0],
            "is_merchant_dest": [1, 1, 0, 0],
            "isFraud": [0, 0, 1, 0],
        }
    )
    X_train, X_test, y_train, y_test = split_data(df, test_size=0.25, random_state=42)
    assert "isFraud" not in X_train.columns
    assert "isFraud" not in X_test.columns
    assert len(X_train) == 3
    assert len(X_test) == 1


def test_train_and_validate():
    """End-to-end: train on synthetic data, validate metrics shape."""
    df = pd.DataFrame(
        {
            "amount_log": np.random.randn(200),
            "is_round_amount": np.random.randint(0, 2, 200),
            "amount_to_balance_ratio": np.random.rand(200),
            "balance_diff_orig": np.random.randn(200),
            "balance_diff_dest": np.random.randn(200),
            "balance_change_orig": np.random.randn(200),
            "balance_change_dest": np.random.randn(200),
            "zero_balance_orig": np.random.randint(0, 2, 200),
            "zero_balance_dest": np.random.randint(0, 2, 200),
            "hour_of_step": np.random.randint(0, 24, 200),
            "hour_of_step_sin": np.random.randn(200),
            "hour_of_step_cos": np.random.randn(200),
            "type_encoded": np.random.randint(0, 5, 200),
            "type_CASH_IN": np.random.randint(0, 2, 200),
            "type_CASH_OUT": np.random.randint(0, 2, 200),
            "type_DEBIT": np.random.randint(0, 2, 200),
            "type_PAYMENT": np.random.randint(0, 2, 200),
            "type_TRANSFER": np.random.randint(0, 2, 200),
            "freq_orig": np.random.randint(1, 10, 200),
            "freq_dest": np.random.randint(1, 10, 200),
            "is_new_orig": np.random.randint(0, 2, 200),
            "is_new_dest": np.random.randint(0, 2, 200),
            "is_merchant_orig": np.random.randint(0, 2, 200),
            "is_merchant_dest": np.random.randint(0, 2, 200),
            "isFraud": np.random.randint(0, 2, 200),
        }
    )
    X_train, X_test, y_train, y_test = split_data(df, test_size=0.3, random_state=42)
    model = build_model(contamination=0.1, n_estimators=50, random_state=42)
    model = train_model(model, X_train)

    metrics = validate_model(model, X_test, y_test, contamination=0.1)
    assert "precision" in metrics
    assert "recall" in metrics
    assert "roc_auc" in metrics
    assert 0 <= metrics["roc_auc"] <= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
