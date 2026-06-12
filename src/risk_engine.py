"""
Risk Engine Module — LedgerWatch AI (Day 7)
Converts raw anomaly scores to calibrated 0-100 risk scores.

Design: Percentile-based calibration on training-set anomaly scores.
- 0   = lowest risk (bottom percentile of training distribution)
- 100 = highest risk (top percentile of training distribution)
- No labels needed — purely unsupervised
- Robust to outliers (percentiles vs. MinMax)
"""

import sys
from pathlib import Path

# Add project root to path for standalone execution
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from typing import Optional, Union

import joblib
import numpy as np
import pandas as pd

from src.config import settings


class RiskEngine:
    """
    Percentile-based risk calibration engine.

    Maps anomaly scores to 0-100 integer risk scores using training-set
    percentiles. Interpretation: "This transaction is riskier than X%
    of historical transactions."
    """

    def __init__(self, percentile_bins: int = 100):
        """
        Initialize RiskEngine.

        Args:
            percentile_bins: Number of percentile bins. Default 100
                             gives a 0-100 integer scale.
        """
        self.percentile_bins = percentile_bins
        self._percentiles: Optional[np.ndarray] = None
        self._is_fitted: bool = False

    def fit(self, anomaly_scores: Union[np.ndarray, pd.Series, list]) -> "RiskEngine":
        """
        Fit percentile thresholds on training anomaly scores.

        Args:
            anomaly_scores: Array of anomaly scores from training set.
                            Higher = more anomalous.

        Returns:
            self (fitted RiskEngine)
        """
        scores = np.asarray(anomaly_scores, dtype=np.float64)

        if len(scores) == 0:
            raise ValueError("Cannot fit on empty anomaly_scores.")

        # Compute boundaries for each percentile: 0, 1, 2, ..., 100
        # percentile_bins=100 => 101 boundaries
        self._percentiles = np.percentile(
            scores,
            np.linspace(0, 100, self.percentile_bins + 1),
        )

        # Enforce monotonicity (protects against duplicate score edge cases)
        self._percentiles = np.maximum.accumulate(self._percentiles)

        self._is_fitted = True
        return self

    def transform(
        self, anomaly_scores: Union[np.ndarray, pd.Series, list]
    ) -> np.ndarray:
        """
        Transform anomaly scores to 0-100 risk scores.

        Uses np.searchsorted for O(log n) lookup per score.

        Args:
            anomaly_scores: Raw anomaly scores to transform.
                            Higher = more anomalous.

        Returns:
            Integer array of risk scores in [0, 100].
        """
        if not self._is_fitted:
            raise RuntimeError(
                "RiskEngine must be fitted before transform. Call .fit() first."
            )

        scores = np.asarray(anomaly_scores, dtype=np.float64)

        # searchsorted finds which percentile bin each score falls into
        # side='right' ensures scores exactly equal to a boundary go to the higher bin
        risk_scores = np.searchsorted(self._percentiles, scores, side="right") - 1

        # Clip to safe range [0, percentile_bins]
        risk_scores = np.clip(risk_scores, 0, self.percentile_bins)

        return risk_scores.astype(int)

    def fit_transform(
        self, anomaly_scores: Union[np.ndarray, pd.Series, list]
    ) -> np.ndarray:
        """Fit then transform in one call."""
        return self.fit(anomaly_scores).transform(anomaly_scores)

    def predict_risk(
        self, anomaly_scores: Union[np.ndarray, pd.Series, list]
    ) -> np.ndarray:
        """Alias for transform. Matches sklearn-style API."""
        return self.transform(anomaly_scores)

    def get_risk_band(self, risk_score: int) -> str:
        """
        Map numeric risk score to human-readable risk band.

        Args:
            risk_score: Integer 0-100.

        Returns:
            Risk band string.
        """
        if risk_score >= 90:
            return "Critical"
        elif risk_score >= 75:
            return "High"
        elif risk_score >= 50:
            return "Elevated"
        elif risk_score >= 25:
            return "Medium"
        else:
            return "Low"

    def save(self, path: str) -> str:
        """
        Save fitted RiskEngine to disk.

        Args:
            path: File path (.joblib recommended).

        Returns:
            Absolute path to saved file.
        """
        if not self._is_fitted:
            raise RuntimeError("Cannot save an unfitted RiskEngine.")

        payload = {
            "percentiles": self._percentiles,
            "percentile_bins": self.percentile_bins,
            "is_fitted": self._is_fitted,
        }
        joblib.dump(payload, path)
        return str(Path(path).resolve())

    @classmethod
    def load(cls, path: str) -> "RiskEngine":
        """
        Load a fitted RiskEngine from disk.

        Args:
            path: File path to load from.

        Returns:
            Fitted RiskEngine instance.
        """
        data = joblib.load(path)

        engine = cls(percentile_bins=data["percentile_bins"])
        engine._percentiles = data["percentiles"]
        engine._is_fitted = data["is_fitted"]

        return engine

    def __repr__(self) -> str:
        status = "fitted" if self._is_fitted else "unfitted"
        return f"RiskEngine(bins={self.percentile_bins}, status={status})"


def compute_anomaly_scores(model, X: pd.DataFrame) -> np.ndarray:
    """
    Compute normalized anomaly scores from an Isolation Forest model.

    Pipeline:
        1. model.decision_function(X)  -> negative = more anomalous
        2. Invert sign                 -> higher = more anomalous
        3. MinMax normalize to [0, 1]  -> stable scale

    Args:
        model: Trained IsolationForest (or dict with 'model' key).
        X: Feature DataFrame (must match training feature order).

    Returns:
        Normalized anomaly scores in [0, 1].
    """
    from sklearn.preprocessing import MinMaxScaler

    # Unwrap if passed as dict container
    if isinstance(model, dict):
        feature_names = model.get("feature_names", X.columns.tolist())
        model = model["model"]
        X = X[feature_names]

    raw_scores = model.decision_function(X)
    inverted = -raw_scores
    normalized = MinMaxScaler().fit_transform(inverted.reshape(-1, 1)).flatten()

    return normalized


def compute_risk_scores(
    model,
    X: pd.DataFrame,
    risk_engine: Optional[RiskEngine] = None,
) -> dict:
    """
    End-to-end: anomaly scores + optional risk scores for a DataFrame.

    Args:
        model: Trained IsolationForest or model dict.
        X: Feature DataFrame.
        risk_engine: Fitted RiskEngine. If None, returns raw scores only.

    Returns:
        Dictionary with keys:
            - anomaly_scores: np.ndarray (normalized [0,1])
            - risk_scores: np.ndarray (0-100) or None
            - risk_bands: list[str] or None
            - is_anomaly: np.ndarray (bool, based on model.predict)
    """
    # Handle dict container
    if isinstance(model, dict):
        feature_names = model.get("feature_names", X.columns.tolist())
        model = model["model"]
        X = X[feature_names]

    # Raw anomaly decision
    is_anomaly = model.predict(X) == -1

    # Normalized scores
    anomaly_scores = compute_anomaly_scores(model, X)

    result = {
        "anomaly_scores": anomaly_scores,
        "is_anomaly": is_anomaly,
        "risk_scores": None,
        "risk_bands": None,
    }

    if risk_engine is not None and risk_engine._is_fitted:
        risk_scores = risk_engine.transform(anomaly_scores)
        risk_bands = [risk_engine.get_risk_band(int(s)) for s in risk_scores]

        result["risk_scores"] = risk_scores
        result["risk_bands"] = risk_bands

    return result


if __name__ == "__main__":
    # ── Quick sanity check ──────────────────────────────────────────
    print("=" * 50)
    print("LedgerWatch AI — Day 7: Risk Engine Sanity Check")
    print("=" * 50)

    np.random.seed(42)
    train_scores = np.random.exponential(scale=0.1, size=50_000)

    engine = RiskEngine(percentile_bins=100)
    engine.fit(train_scores)

    test_scores = np.array([0.01, 0.05, 0.10, 0.20, 0.50])
    risk_scores = engine.transform(test_scores)

    print(f"\nEngine: {engine}")
    print(f"Train score count: {len(train_scores):,}")
    print(f"Test scores:  {test_scores}")
    print(f"Risk scores:  {risk_scores}")
    print(f"Risk bands:   {[engine.get_risk_band(s) for s in risk_scores]}")

    # Save / load round-trip
    save_path = "saved_models/risk_engine_v1.0.0.joblib"
    engine.save(save_path)
    loaded = RiskEngine.load(save_path)

    print(f"\nLoaded engine: {loaded}")
    print(
        f"Round-trip match: {np.array_equal(loaded.transform(test_scores), risk_scores)}"
    )
    print("=" * 50)
