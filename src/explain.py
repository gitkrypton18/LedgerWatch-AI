"""
LedgerWatch AI — SHAP Explainability Module (Day 8)
Provides model-agnostic explanations for Isolation Forest predictions.
"""

import json
import os
import warnings
from typing import Dict, List, Optional, Union

import joblib
import matplotlib
import numpy as np
import pandas as pd
import shap

matplotlib.use("Agg")  # Non-interactive backend for headless/server use
import matplotlib.pyplot as plt

from src.config import settings


def load_model_and_features(model_path: Optional[str] = None):
    """Load model container and extract model + feature names."""
    path = model_path or settings.MODEL_PATH
    container = joblib.load(path)
    return container["model"], container.get("feature_names", [])


def compute_shap_values(
    model,
    X: pd.DataFrame,
    feature_names: Optional[List[str]] = None,
    check_additivity: bool = False,
    explainer=None,  # ← ADD THIS PARAMETER
) -> np.ndarray:
    """
    Compute SHAP values for Isolation Forest.
    ...
    """
    if feature_names is None:
        feature_names = list(X.columns)

    X_arr = X[feature_names].values if isinstance(X, pd.DataFrame) else X

    if explainer is None:
        explainer = shap.TreeExplainer(model, feature_perturbation="interventional")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        sv = explainer.shap_values(X_arr, check_additivity=check_additivity)

    # Handle both list and array return types
    if isinstance(sv, list):
        sv = sv[1] if len(sv) > 1 else sv[0]

    # FLIP sign: IsolationForest lower score = more anomalous
    # After flip: positive SHAP = pushes toward anomaly
    sv = -np.array(sv)

    return sv


def explain_transaction(
    model,
    X_row: Union[pd.DataFrame, pd.Series, np.ndarray],
    feature_names: List[str],
    check_additivity: bool = False,
    explainer=None,
) -> Dict:
    """Explain a single transaction. Returns dict with contributions, base_value, prediction."""
    if isinstance(X_row, pd.Series):
        X_row = X_row.to_frame().T
    elif isinstance(X_row, np.ndarray):
        if X_row.ndim == 1:
            X_row = X_row.reshape(1, -1)
        X_row = pd.DataFrame(X_row, columns=feature_names)

    X_sub = X_row[feature_names]
    X_arr = X_sub.values

    if explainer is None:
        explainer = shap.TreeExplainer(model, feature_perturbation="interventional")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        sv = explainer.shap_values(X_arr, check_additivity=check_additivity)

    if isinstance(sv, list):
        sv = sv[1] if len(sv) > 1 else sv[0]

    sv = -np.array(sv)
    shap_row = sv[0]
    values = X_arr[0]

    contributions = []
    for feat, val, shap_val in zip(feature_names, values, shap_row):
        contributions.append(
            {
                "feature": feat,
                "value": float(val),
                "shap_value": float(shap_val),
                "abs_shap": float(abs(shap_val)),
            }
        )

    contributions.sort(key=lambda x: x["abs_shap"], reverse=True)

    base = explainer.expected_value
    if isinstance(base, (list, np.ndarray)):
        base = float(base[0]) if len(base) > 0 else 0.0
    else:
        base = float(base)

    return {
        "contributions": contributions,
        "base_value": base,
        "prediction": float(model.decision_function(X_arr)[0]),
    }


def get_global_feature_importance(
    shap_values: np.ndarray, feature_names: List[str]
) -> pd.DataFrame:
    """Mean absolute SHAP value per feature. Returns sorted DataFrame."""
    mean_abs = np.abs(shap_values).mean(axis=0)
    df = pd.DataFrame(
        {
            "feature": feature_names,
            "mean_abs_shap": mean_abs,
            "mean_abs_shap_pct": mean_abs / (mean_abs.sum() + 1e-9) * 100,
        }
    )
    return df.sort_values("mean_abs_shap", ascending=False).reset_index(drop=True)


def plot_waterfall(
    explanation: Dict,
    feature_names: List[str],
    max_display: int = 10,
    output_path: Optional[str] = None,
    title: str = "SHAP Waterfall",
) -> str:
    """Custom matplotlib waterfall plot. Returns path to saved PNG."""
    if output_path is None:
        output_path = "docs/day8_shap_waterfall.png"

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    contribs = explanation["contributions"][:max_display]
    feats = [c["feature"] for c in contribs]
    shap_vals = [c["shap_value"] for c in contribs]
    raw_vals = [c["value"] for c in contribs]

    colors = ["#ff0051" if v > 0 else "#008bfb" for v in shap_vals]

    fig, ax = plt.subplots(figsize=(10, max_display * 0.45 + 1.5))
    y_pos = np.arange(len(feats))

    ax.barh(y_pos, shap_vals, color=colors, edgecolor="black", linewidth=0.5)
    ax.set_yticks(y_pos)
    ax.set_yticklabels([f"{f} = {v:.3g}" for f, v in zip(feats, raw_vals)])
    ax.invert_yaxis()
    ax.axvline(x=0, color="black", linewidth=0.8)
    ax.set_xlabel("SHAP value  ( → pushes toward ANOMALY )")
    ax.set_title(title, fontsize=12, weight="bold")

    base = explanation.get("base_value", 0.0)
    ax.text(
        0.02,
        0.98,
        f"Base value: {base:.4f}",
        transform=ax.transAxes,
        fontsize=9,
        verticalalignment="top",
        bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.5),
    )

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    return output_path


def plot_summary_beeswarm(
    shap_values: np.ndarray,
    X: pd.DataFrame,
    feature_names: List[str],
    output_path: Optional[str] = None,
    max_display: int = 15,
) -> str:
    """SHAP beeswarm summary plot. Returns path to saved PNG."""
    if output_path is None:
        output_path = "docs/day8_shap_summary.png"

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    fig = plt.figure(figsize=(10, max_display * 0.45 + 2))

    shap.summary_plot(
        shap_values,
        X[feature_names].values,
        feature_names=feature_names,
        max_display=max_display,
        show=False,
        plot_size=None,
    )

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    return output_path


def plot_feature_importance_bar(
    importance_df: pd.DataFrame,
    output_path: Optional[str] = None,
    max_display: int = 15,
) -> str:
    """Horizontal bar chart of mean |SHAP|. Returns path to saved PNG."""
    if output_path is None:
        output_path = "docs/day8_shap_importance_bar.png"

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    df = importance_df.head(max_display).sort_values("mean_abs_shap", ascending=True)

    fig, ax = plt.subplots(figsize=(10, max_display * 0.4 + 1.5))
    colors = plt.cm.RdYlGn_r(np.linspace(0.15, 0.85, len(df)))
    ax.barh(
        df["feature"],
        df["mean_abs_shap"],
        color=colors,
        edgecolor="black",
        linewidth=0.5,
    )
    ax.set_xlabel("Mean |SHAP value|")
    ax.set_title(
        "Global Feature Importance (Mean Absolute SHAP)", fontsize=12, weight="bold"
    )

    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    return output_path


def export_shap_summary(
    importance_df: pd.DataFrame,
    sample_explanations: List[Dict],
    output_path: str = "docs/day8_shap_summary.json",
) -> str:
    """Export SHAP analysis to JSON. Returns path to saved JSON."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    summary = {
        "metadata": {
            "day": 8,
            "module": "explain",
            "feature_count": len(importance_df),
            "top_feature": (
                importance_df.iloc[0]["feature"] if len(importance_df) > 0 else None
            ),
        },
        "global_importance": importance_df.to_dict(orient="records"),
        "sample_explanations": [
            {
                "prediction": exp["prediction"],
                "top_3_features": [c["feature"] for c in exp["contributions"][:3]],
                "top_3_shap": [c["shap_value"] for c in exp["contributions"][:3]],
            }
            for exp in sample_explanations
        ],
    }

    with open(output_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)

    return output_path


def explain_pipeline(
    model_path: Optional[str] = None,
    data_path: Optional[str] = None,
    sample_size: int = 5000,
    output_dir: str = "docs",
) -> Dict:
    """
    End-to-end SHAP explanation pipeline.
    Returns dict with importance_df, sample_explanations, paths, shap_values, X_sample.
    """
    model, feature_names = load_model_and_features(model_path)
    data_path = data_path or settings.PROCESSED_DIR

    df = pd.read_csv(data_path)

    # Stratified sample for speed
    if sample_size and len(df) > sample_size:
        fraud_df = df[df["isFraud"] == 1]
        normal_df = df[df["isFraud"] == 0]

        n_fraud = min(len(fraud_df), max(int(sample_size * 0.15), 50))
        n_normal = sample_size - n_fraud

        fraud_sample = fraud_df.sample(n=n_fraud, random_state=42)
        normal_sample = normal_df.sample(n=n_normal, random_state=42)
        df_sample = pd.concat([fraud_sample, normal_sample]).sample(
            frac=1, random_state=42
        )
    else:
        df_sample = df

    X = df_sample[feature_names].reset_index(drop=True)
    y = (
        df_sample["isFraud"].reset_index(drop=True)
        if "isFraud" in df_sample.columns
        else None
    )

    # Compute SHAP values
    shap_values = compute_shap_values(model, X, feature_names)

    # Global importance
    importance_df = get_global_feature_importance(shap_values, feature_names)

    # Pick sample transactions for waterfall plots
    scores = model.decision_function(X.values)
    risk_scores = -scores  # higher = more anomalous

    fraud_idx = int(np.argsort(risk_scores)[-1]) if y is not None and y.sum() > 0 else 0
    normal_idx = int(np.argsort(risk_scores)[0])
    mid_idx = int(np.argsort(risk_scores)[len(risk_scores) // 2])

    samples = [
        explain_transaction(model, X.iloc[fraud_idx], feature_names),
        explain_transaction(model, X.iloc[normal_idx], feature_names),
        explain_transaction(model, X.iloc[mid_idx], feature_names),
    ]

    os.makedirs(output_dir, exist_ok=True)
    paths = {}

    paths["summary_plot"] = plot_summary_beeswarm(
        shap_values, X, feature_names, output_path=f"{output_dir}/day8_shap_summary.png"
    )

    paths["importance_bar"] = plot_feature_importance_bar(
        importance_df, output_path=f"{output_dir}/day8_shap_importance_bar.png"
    )

    paths["waterfall_fraud"] = plot_waterfall(
        samples[0],
        feature_names,
        output_path=f"{output_dir}/day8_shap_waterfall_fraud.png",
        title="SHAP Waterfall — High-Risk (Fraud-like) Transaction",
    )

    paths["waterfall_normal"] = plot_waterfall(
        samples[1],
        feature_names,
        output_path=f"{output_dir}/day8_shap_waterfall_normal.png",
        title="SHAP Waterfall — Low-Risk (Normal) Transaction",
    )

    paths["waterfall_mid"] = plot_waterfall(
        samples[2],
        feature_names,
        output_path=f"{output_dir}/day8_shap_waterfall_mid.png",
        title="SHAP Waterfall — Medium-Risk Transaction",
    )

    paths["json"] = export_shap_summary(
        importance_df, samples, output_path=f"{output_dir}/day8_shap_summary.json"
    )

    return {
        "importance_df": importance_df,
        "sample_explanations": samples,
        "paths": paths,
        "shap_values": shap_values,
        "X_sample": X,
        "y_sample": y,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="LedgerWatch SHAP Explainability")
    parser.add_argument("--sample", type=int, default=5000, help="Sample size")
    parser.add_argument("--output-dir", type=str, default="docs")
    args = parser.parse_args()

    result = explain_pipeline(sample_size=args.sample, output_dir=args.output_dir)
    print(f"SHAP analysis complete.")
    print(f"Top feature: {result['importance_df'].iloc[0]['feature']}")
    print(f"Plots saved to: {args.output_dir}/")
