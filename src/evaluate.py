"""
LedgerWatch AI — Day 5: Model Evaluation Pipeline
==================================================
Production evaluation module for Isolation Forest anomaly detection.

Provides:
- Comprehensive metrics computation (ROC-AUC, PR-AUC, Precision, Recall, F1)
- Threshold tuning (F1-optimized, Precision-optimized, Recall-optimized)
- Baseline comparisons (random, rule-based)
- Plot generation (ROC, PR, threshold tradeoffs, confusion matrix)
- JSON metrics export for reproducibility

Usage:
    from src.evaluate import evaluate_model, plot_evaluation_curves
    metrics = evaluate_model(model, X_test, y_test, feature_names)
    plot_evaluation_curves(metrics, output_dir="docs/")

Author: Kalpit
"""

import json
import os
import warnings
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import matplotlib
import numpy as np
import pandas as pd

matplotlib.use("Agg")  # Non-interactive backend for server environments
import matplotlib.pyplot as plt
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.preprocessing import MinMaxScaler

from src.config import settings

warnings.filterwarnings("ignore")


# ---------------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------------


@dataclass
class ThresholdMetrics:
    """Metrics at a specific decision threshold."""

    threshold: float
    precision: float
    recall: float
    f1: float
    accuracy: float
    flagged: int
    tp: int
    fp: int
    tn: int
    fn: int


@dataclass
class RankingMetrics:
    """Threshold-independent ranking metrics."""

    roc_auc: float
    pr_auc: float


@dataclass
class BaselineMetrics:
    """Baseline model/rule metrics."""

    name: str
    precision: float
    recall: float
    f1: float
    flagged: int


@dataclass
class EvaluationResult:
    """Complete evaluation result container."""

    model_name: str
    model_version: str
    n_estimators: int
    contamination: float
    feature_count: int
    feature_names: List[str]
    dataset_rows: int
    test_rows: int
    test_frauds: int
    test_fraud_rate: float
    ranking_metrics: RankingMetrics
    contamination_threshold: ThresholdMetrics
    f1_optimized: ThresholdMetrics
    precision_optimized: ThresholdMetrics
    recall_optimized: ThresholdMetrics
    baselines: List[BaselineMetrics]
    timestamp: str


# ---------------------------------------------------------------------------
# Core Functions
# ---------------------------------------------------------------------------


def compute_anomaly_scores(model, X: pd.DataFrame) -> np.ndarray:
    """
    Compute normalized anomaly scores from Isolation Forest.

    Higher score = more anomalous (fraud-like).
    Output range: [0, 1]
    """
    raw_scores = model.decision_function(X)
    # Invert: lower raw score = more anomalous
    inverted = -raw_scores
    # Normalize to [0, 1]
    scaler = MinMaxScaler()
    normalized = scaler.fit_transform(inverted.reshape(-1, 1)).flatten()
    return normalized


def find_optimal_thresholds(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    min_recall_for_precision: float = 0.10,
    min_precision_for_recall: float = 0.02,
) -> Tuple[ThresholdMetrics, ThresholdMetrics, ThresholdMetrics]:
    """
    Find F1-optimized, precision-optimized, and recall-optimized thresholds.

    Returns:
        (f1_optimal, precision_optimal, recall_optimal)
    """
    precision_curve, recall_curve, thresholds = precision_recall_curve(y_true, y_scores)

    # F1 scores (precision_curve and recall_curve are len(thresholds)+1)
    f1_scores = (
        2
        * (precision_curve[:-1] * recall_curve[:-1])
        / (precision_curve[:-1] + recall_curve[:-1] + 1e-10)
    )

    # F1-optimized
    best_f1_idx = int(np.argmax(f1_scores))
    best_f1_thresh = float(thresholds[best_f1_idx])

    # Precision-optimized with minimum recall constraint
    valid_prec_idx = np.where(recall_curve[:-1] >= min_recall_for_precision)[0]
    if len(valid_prec_idx) > 0:
        best_prec_idx = int(valid_prec_idx[np.argmax(precision_curve[valid_prec_idx])])
        best_prec_thresh = float(thresholds[best_prec_idx])
    else:
        best_prec_idx = best_f1_idx
        best_prec_thresh = best_f1_thresh

    # Recall-optimized with minimum precision constraint
    valid_rec_idx = np.where(precision_curve[:-1] >= min_precision_for_recall)[0]
    if len(valid_rec_idx) > 0:
        best_rec_idx = int(valid_rec_idx[np.argmax(recall_curve[valid_rec_idx])])
        best_rec_thresh = float(thresholds[best_rec_idx])
    else:
        best_rec_idx = best_f1_idx
        best_rec_thresh = best_f1_thresh

    def _make_metrics(thresh: float, idx: int) -> ThresholdMetrics:
        pred = (y_scores >= thresh).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, pred).ravel()
        return ThresholdMetrics(
            threshold=thresh,
            precision=float(precision_curve[idx]),
            recall=float(recall_curve[idx]),
            f1=float(f1_scores[idx]),
            accuracy=float(accuracy_score(y_true, pred)),
            flagged=int(pred.sum()),
            tp=int(tp),
            fp=int(fp),
            tn=int(tn),
            fn=int(fn),
        )

    f1_metrics = _make_metrics(best_f1_thresh, best_f1_idx)
    prec_metrics = _make_metrics(best_prec_thresh, best_prec_idx)
    rec_metrics = _make_metrics(best_rec_thresh, best_rec_idx)

    return f1_metrics, prec_metrics, rec_metrics


def compute_contamination_threshold(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    contamination: float = 0.01,
) -> ThresholdMetrics:
    """Compute metrics at the contamination-based threshold (top N% flagged)."""
    thresh = float(np.percentile(y_scores, 100 * (1 - contamination)))
    pred = (y_scores >= thresh).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred).ravel()

    return ThresholdMetrics(
        threshold=thresh,
        precision=float(precision_score(y_true, pred, zero_division=0)),
        recall=float(recall_score(y_true, pred, zero_division=0)),
        f1=float(f1_score(y_true, pred, zero_division=0)),
        accuracy=float(accuracy_score(y_true, pred)),
        flagged=int(pred.sum()),
        tp=int(tp),
        fp=int(fp),
        tn=int(tn),
        fn=int(fn),
    )


def compute_baseline_metrics(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    contamination: float = 0.01,
) -> List[BaselineMetrics]:
    """Compute baseline metrics for comparison."""
    baselines = []
    n = len(y_true)

    # Random classifier
    np.random.seed(42)
    random_pred = np.random.choice([0, 1], size=n, p=[1 - contamination, contamination])
    baselines.append(
        BaselineMetrics(
            name="Random Classifier",
            precision=float(precision_score(y_true, random_pred, zero_division=0)),
            recall=float(recall_score(y_true, random_pred, zero_division=0)),
            f1=float(f1_score(y_true, random_pred, zero_division=0)),
            flagged=int(random_pred.sum()),
        )
    )

    return baselines


# ---------------------------------------------------------------------------
# Main Evaluation Entry Point
# ---------------------------------------------------------------------------


def evaluate_model(
    model,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    feature_names: Optional[List[str]] = None,
    contamination: Optional[float] = None,
) -> EvaluationResult:
    """
    Run full evaluation pipeline on trained Isolation Forest model.

    Args:
        model: Trained IsolationForest instance
        X_test: Test feature matrix
        y_test: Test labels (for validation only)
        feature_names: List of feature names used during training
        contamination: Expected anomaly proportion (default from settings)

    Returns:
        EvaluationResult with all metrics and thresholds
    """
    if contamination is None:
        contamination = float(settings.CONTAMINATION)

    if feature_names is None:
        feature_names = list(X_test.columns)

    # Ensure correct feature order
    X_test = X_test[feature_names]

    y_true = y_test.values if hasattr(y_test, "values") else np.array(y_test)

    # Compute anomaly scores
    y_scores = compute_anomaly_scores(model, X_test)

    # Ranking metrics
    roc_auc = float(roc_auc_score(y_true, y_scores))
    pr_auc = float(average_precision_score(y_true, y_scores))
    ranking = RankingMetrics(roc_auc=roc_auc, pr_auc=pr_auc)

    # Threshold-based metrics
    contam_metrics = compute_contamination_threshold(y_true, y_scores, contamination)
    f1_opt, prec_opt, rec_opt = find_optimal_thresholds(y_true, y_scores)

    # Baselines
    baselines = compute_baseline_metrics(y_true, y_scores, contamination)

    # Model metadata
    model_version = getattr(model, "_model_version", "1.0.0")

    result = EvaluationResult(
        model_name="Isolation Forest",
        model_version=model_version,
        n_estimators=getattr(model, "n_estimators", 200),
        contamination=float(getattr(model, "contamination", contamination)),
        feature_count=len(feature_names),
        feature_names=feature_names,
        dataset_rows=int(len(X_test)),  # Test set size
        test_rows=int(len(y_true)),
        test_frauds=int(y_true.sum()),
        test_fraud_rate=float(y_true.mean()),
        ranking_metrics=ranking,
        contamination_threshold=contam_metrics,
        f1_optimized=f1_opt,
        precision_optimized=prec_opt,
        recall_optimized=rec_opt,
        baselines=baselines,
        timestamp=datetime.now().isoformat(),
    )

    return result


# ---------------------------------------------------------------------------
# Plotting Functions
# ---------------------------------------------------------------------------


def plot_roc_pr_curves(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    roc_auc: float,
    pr_auc: float,
    output_path: str,
) -> None:
    """Generate ROC and Precision-Recall curve plots."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # ROC Curve
    ax1 = axes[0]
    fpr, tpr, _ = roc_curve(y_true, y_scores)
    ax1.plot(
        fpr,
        tpr,
        color="#2E86AB",
        linewidth=2,
        label=f"Isolation Forest (AUC = {roc_auc:.4f})",
    )
    ax1.plot(
        [0, 1],
        [0, 1],
        color="gray",
        linestyle="--",
        linewidth=1,
        label="Random (AUC = 0.5000)",
    )
    ax1.fill_between(fpr, tpr, alpha=0.15, color="#2E86AB")
    ax1.set_xlabel("False Positive Rate", fontsize=11)
    ax1.set_ylabel("True Positive Rate (Recall)", fontsize=11)
    ax1.set_title("ROC Curve", fontsize=12, fontweight="bold")
    ax1.legend(loc="lower right", fontsize=9)
    ax1.set_xlim([0, 1])
    ax1.set_ylim([0, 1])
    ax1.grid(True, alpha=0.3)

    # PR Curve
    ax2 = axes[1]
    precision_vals, recall_vals, _ = precision_recall_curve(y_true, y_scores)
    baseline = float(y_true.mean())
    ax2.plot(
        recall_vals,
        precision_vals,
        color="#A23B72",
        linewidth=2,
        label=f"Isolation Forest (AP = {pr_auc:.4f})",
    )
    ax2.axhline(
        y=baseline,
        color="gray",
        linestyle="--",
        linewidth=1,
        label=f"Random Baseline (AP = {baseline:.4f})",
    )
    ax2.fill_between(recall_vals, precision_vals, alpha=0.15, color="#A23B72")
    ax2.set_xlabel("Recall", fontsize=11)
    ax2.set_ylabel("Precision", fontsize=11)
    ax2.set_title("Precision-Recall Curve", fontsize=12, fontweight="bold")
    ax2.legend(loc="upper right", fontsize=9)
    ax2.set_xlim([0, 1])
    ax2.set_ylim([0, 1])
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


def plot_threshold_tradeoffs(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    thresholds_dict: Dict[str, ThresholdMetrics],
    output_path: str,
) -> None:
    """Generate threshold tradeoff plots."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    precision_curve, recall_curve, thresholds = precision_recall_curve(y_true, y_scores)
    f1_scores = (
        2
        * (precision_curve[:-1] * recall_curve[:-1])
        / (precision_curve[:-1] + recall_curve[:-1] + 1e-10)
    )

    # Left: PR/F1 vs Threshold
    ax1 = axes[0]
    ax1.plot(
        thresholds,
        precision_curve[:-1],
        color="#E63946",
        linewidth=2,
        label="Precision",
        alpha=0.8,
    )
    ax1.plot(
        thresholds,
        recall_curve[:-1],
        color="#2A9D8F",
        linewidth=2,
        label="Recall",
        alpha=0.8,
    )
    ax1.plot(
        thresholds, f1_scores, color="#F4A261", linewidth=2, label="F1-Score", alpha=0.8
    )

    colors = {
        "f1_optimized": "#F4A261",
        "precision_optimized": "#E63946",
        "recall_optimized": "#2A9D8F",
    }
    for name, metrics in thresholds_dict.items():
        if name != "contamination":
            color = colors.get(name, "gray")
            ax1.axvline(x=metrics.threshold, color=color, linestyle="--", alpha=0.5)

    ax1.set_xlabel("Threshold (Anomaly Score)", fontsize=11)
    ax1.set_ylabel("Score", fontsize=11)
    ax1.set_title(
        "Precision / Recall / F1 vs Threshold", fontsize=12, fontweight="bold"
    )
    ax1.legend(loc="lower left", fontsize=9)
    ax1.set_xlim([0, 1])
    ax1.set_ylim([0, 1])
    ax1.grid(True, alpha=0.3)

    # Right: Fraud Detection Yield Curve
    ax2 = axes[1]
    percentiles = np.linspace(0, 100, 200)
    sample_thresholds = np.percentile(y_scores, percentiles)
    flagged_counts = []
    fraud_caught_counts = []

    for t in sample_thresholds:
        pred = (y_scores >= t).astype(int)
        flagged_counts.append(int(pred.sum()))
        fraud_caught_counts.append(int(((pred == 1) & (y_true == 1)).sum()))

    ax2.plot(flagged_counts, fraud_caught_counts, color="#6A4C93", linewidth=2)
    ax2.fill_between(flagged_counts, fraud_caught_counts, alpha=0.15, color="#6A4C93")

    strategy_colors = {
        "contamination": "#457B9D",
        "f1_optimized": "#F4A261",
        "precision_optimized": "#E63946",
        "recall_optimized": "#2A9D8F",
    }
    for name, metrics in thresholds_dict.items():
        color = strategy_colors.get(name, "gray")
        ax2.scatter(
            metrics.flagged,
            metrics.tp,
            color=color,
            s=100,
            zorder=5,
            edgecolors="white",
            linewidths=1.5,
        )
        label = name.replace("_", " ").title()
        ax2.annotate(
            label,
            (metrics.flagged, metrics.tp),
            textcoords="offset points",
            xytext=(10, 5),
            fontsize=8,
            color=color,
        )

    ax2.set_xlabel("Total Transactions Flagged", fontsize=11)
    ax2.set_ylabel("Frauds Caught (True Positives)", fontsize=11)
    ax2.set_title("Fraud Detection Yield Curve", fontsize=12, fontweight="bold")
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    output_path: str,
) -> None:
    """Generate confusion matrix heatmap."""
    fig, ax = plt.subplots(figsize=(6, 5))
    cm = confusion_matrix(y_true, y_pred)
    disp = ConfusionMatrixDisplay(
        confusion_matrix=cm, display_labels=["Normal", "Fraud"]
    )
    disp.plot(ax=ax, cmap="Blues", colorbar=True, values_format=",d")

    total = cm.sum()
    for i in range(2):
        for j in range(2):
            pct = cm[i, j] / total * 100
            ax.text(
                j,
                i + 0.15,
                f"({pct:.2f}%)",
                ha="center",
                va="center",
                fontsize=10,
                color="white" if cm[i, j] > cm.max() / 2 else "black",
            )

    ax.set_title("Confusion Matrix", fontsize=12, fontweight="bold")
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()


def plot_evaluation_curves(
    result: EvaluationResult,
    y_true: np.ndarray,
    y_scores: np.ndarray,
    output_dir: str = "docs",
) -> Dict[str, str]:
    """
    Generate all evaluation plots and save to output directory.

    Returns:
        Dictionary mapping plot name to file path
    """
    os.makedirs(output_dir, exist_ok=True)
    paths = {}

    # ROC + PR curves
    roc_pr_path = os.path.join(output_dir, "day5_roc_pr_curves.png")
    plot_roc_pr_curves(
        y_true,
        y_scores,
        result.ranking_metrics.roc_auc,
        result.ranking_metrics.pr_auc,
        roc_pr_path,
    )
    paths["roc_pr"] = roc_pr_path

    # Threshold tradeoffs
    thresholds_dict = {
        "contamination": result.contamination_threshold,
        "f1_optimized": result.f1_optimized,
        "precision_optimized": result.precision_optimized,
        "recall_optimized": result.recall_optimized,
    }
    tradeoff_path = os.path.join(output_dir, "day5_threshold_tradeoffs.png")
    plot_threshold_tradeoffs(y_true, y_scores, thresholds_dict, tradeoff_path)
    paths["threshold_tradeoffs"] = tradeoff_path

    # Confusion matrix at contamination threshold
    y_pred_contam = (y_scores >= result.contamination_threshold.threshold).astype(int)
    cm_path = os.path.join(output_dir, "day5_confusion_matrix.png")
    plot_confusion_matrix(y_true, y_pred_contam, cm_path)
    paths["confusion_matrix"] = cm_path

    return paths


# ---------------------------------------------------------------------------
# Export Functions
# ---------------------------------------------------------------------------


def export_metrics_json(result: EvaluationResult, output_path: str) -> str:
    """Export evaluation results to JSON file."""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    # Convert dataclass to dict recursively
    def _to_dict(obj):
        if isinstance(obj, (list, tuple)):
            return [_to_dict(item) for item in obj]
        elif hasattr(obj, "__dataclass_fields__"):
            return {k: _to_dict(v) for k, v in asdict(obj).items()}
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.integer, np.floating)):
            return float(obj)
        else:
            return obj

    data = _to_dict(result)

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    return output_path


def print_evaluation_report(result: EvaluationResult) -> None:
    """Print a formatted evaluation report to console."""
    print("=" * 70)
    print("LEDGERWATCH AI — EVALUATION REPORT")
    print("=" * 70)
    print(f"Model: {result.model_name} v{result.model_version}")
    print(f"Features: {result.feature_count} | Test Set: {result.test_rows:,} rows")
    print(f"Test Frauds: {result.test_frauds:,} ({result.test_fraud_rate*100:.4f}%)")
    print(f"Timestamp: {result.timestamp}")
    print("-" * 70)

    print("\nRANKING METRICS:")
    print(f"  ROC-AUC: {result.ranking_metrics.roc_auc:.4f}")
    print(f"  PR-AUC:  {result.ranking_metrics.pr_auc:.4f}")

    print("\nTHRESHOLD COMPARISON:")
    print(
        f"{'Strategy':<25} {'Threshold':>10} {'Precision':>10} {'Recall':>8} {'F1':>8} {'Flagged':>10}"
    )
    print("-" * 75)
    for name, metrics in [
        ("Contamination (1%)", result.contamination_threshold),
        ("F1-Optimized", result.f1_optimized),
        ("Precision-Optimized", result.precision_optimized),
        ("Recall-Optimized", result.recall_optimized),
    ]:
        print(
            f"{name:<25} {metrics.threshold:>10.4f} {metrics.precision:>10.4f} "
            f"{metrics.recall:>8.4f} {metrics.f1:>8.4f} {metrics.flagged:>10,}"
        )

    if result.baselines:
        print("\nBASELINES:")
        for baseline in result.baselines:
            print(
                f"  {baseline.name}: P={baseline.precision:.4f}, R={baseline.recall:.4f}, "
                f"F1={baseline.f1:.4f}, Flagged={baseline.flagged:,}"
            )

    print("\n" + "=" * 70)


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    import joblib
    from sklearn.ensemble import IsolationForest

    parser = argparse.ArgumentParser(description="Evaluate LedgerWatch AI model")
    parser.add_argument(
        "--model",
        default="saved_models/isolation_forest_v1.0.0.joblib",
        help="Path to saved model",
    )
    parser.add_argument(
        "--data", default="data/processed/features.csv", help="Path to features CSV"
    )
    parser.add_argument(
        "--output-dir", default="docs", help="Output directory for plots and JSON"
    )
    parser.add_argument(
        "--sample",
        type=int,
        default=None,
        help="Evaluate on random sample of N rows (for quick testing)",
    )

    args = parser.parse_args()

    print(f"Loading model from {args.model}...")
    model_container = joblib.load(args.model)
    if isinstance(model_container, dict):
        model = model_container["model"]
        feature_names = model_container.get("feature_names", None)
    else:
        model = model_container
        feature_names = None

    print(f"Loading data from {args.data}...")
    df = pd.read_csv(args.data)

    if args.sample:
        df = df.sample(n=args.sample, random_state=42)
        print(f"Using sample of {args.sample:,} rows")

    feature_cols = [
        c for c in df.columns if c not in ["isFraud", "nameOrig", "nameDest"]
    ]
    X = df[feature_cols]
    y = df["isFraud"]

    from sklearn.model_selection import train_test_split

    _, X_test, _, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("Running evaluation...")
    result = evaluate_model(model, X_test, y_test, feature_names=feature_names)

    print_evaluation_report(result)

    # Generate plots
    y_scores = compute_anomaly_scores(
        model, X_test[feature_names] if feature_names else X_test
    )
    plot_paths = plot_evaluation_curves(
        result, y_test.values, y_scores, args.output_dir
    )
    print(f"\nPlots saved:")
    for name, path in plot_paths.items():
        print(f"  {name}: {path}")

    # Export JSON
    json_path = os.path.join(args.output_dir, "day5_metrics.json")
    export_metrics_json(result, json_path)
    print(f"\nMetrics exported to: {json_path}")
