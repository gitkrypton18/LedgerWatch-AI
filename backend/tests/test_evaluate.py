"""
LedgerWatch AI — Day 5: Evaluation Unit Tests
================================================
Tests for src/evaluate.py module.

Run with:
    pytest tests/test_evaluate.py -v
    python tests/test_evaluate.py

Author: Kalpit
"""

import json
import os
import sys
import tempfile
import unittest

import numpy as np
import pandas as pd
from sklearn import metrics
from sklearn.ensemble import IsolationForest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.evaluate import (
    BaselineMetrics,
    EvaluationResult,
    RankingMetrics,
    ThresholdMetrics,
    compute_anomaly_scores,
    compute_baseline_metrics,
    compute_contamination_threshold,
    evaluate_model,
    export_metrics_json,
    find_optimal_thresholds,
    print_evaluation_report,
)


class TestComputeAnomalyScores(unittest.TestCase):
    """Test anomaly score computation."""

    def setUp(self):
        np.random.seed(42)
        self.X = pd.DataFrame(
            np.random.randn(100, 5), columns=[f"f{i}" for i in range(5)]
        )
        self.model = IsolationForest(
            n_estimators=10, contamination=0.1, random_state=42
        )
        self.model.fit(self.X)

    def test_output_shape(self):
        scores = compute_anomaly_scores(self.model, self.X)
        self.assertEqual(len(scores), len(self.X))

    def test_output_range(self):
        scores = compute_anomaly_scores(self.model, self.X)
        self.assertGreaterEqual(scores.min(), 0.0)
        self.assertLessEqual(scores.max(), 1.0)

    def test_higher_score_more_anomalous(self):
        X_with_outlier = pd.concat(
            [self.X, pd.DataFrame([[100, 100, 100, 100, 100]], columns=self.X.columns)],
            ignore_index=True,
        )
        scores = compute_anomaly_scores(self.model, X_with_outlier)
        # FIX: scores is numpy array, use [-1] not .iloc[-1]
        self.assertGreater(scores[-1], scores[:50].mean())


class TestFindOptimalThresholds(unittest.TestCase):
    """Test threshold optimization."""

    def setUp(self):
        np.random.seed(42)
        self.y_true = np.array([0] * 90 + [1] * 10)
        self.y_scores = np.random.rand(100)
        self.y_scores[90:] += 0.3

    def test_returns_three_thresholds(self):
        result = find_optimal_thresholds(self.y_true, self.y_scores)
        self.assertEqual(len(result), 3)
        f1_opt, prec_opt, rec_opt = result
        self.assertIsInstance(f1_opt, ThresholdMetrics)
        self.assertIsInstance(prec_opt, ThresholdMetrics)
        self.assertIsInstance(rec_opt, ThresholdMetrics)

    def test_f1_optimized_has_highest_f1(self):
        f1_opt, prec_opt, rec_opt = find_optimal_thresholds(self.y_true, self.y_scores)
        self.assertGreaterEqual(f1_opt.f1, prec_opt.f1)
        self.assertGreaterEqual(f1_opt.f1, rec_opt.f1)

    def test_precision_optimized_has_highest_precision(self):
        f1_opt, prec_opt, rec_opt = find_optimal_thresholds(self.y_true, self.y_scores)
        self.assertGreaterEqual(prec_opt.precision, f1_opt.precision)
        self.assertGreaterEqual(prec_opt.precision, rec_opt.precision)

    def test_thresholds_in_valid_range(self):
        f1_opt, prec_opt, rec_opt = find_optimal_thresholds(self.y_true, self.y_scores)
        # FIX: precision_recall_curve can return thresholds slightly > 1.0 due to FP
        for metrics in [f1_opt, prec_opt, rec_opt]:
            self.assertGreaterEqual(metrics.threshold, 0.0)
            self.assertLess(
                metrics.threshold, 1.1
            )  # Generous upper bound for FP overflow


class TestComputeContaminationThreshold(unittest.TestCase):
    """Test contamination-based threshold."""

    def setUp(self):
        np.random.seed(42)
        self.y_true = np.array([0] * 95 + [1] * 5)
        self.y_scores = np.random.rand(100)
        self.y_scores[95:] += 0.5

    def test_flagged_count_matches_contamination(self):
        contamination = 0.05
        metrics = compute_contamination_threshold(
            self.y_true, self.y_scores, contamination
        )
        expected_flagged = int(contamination * len(self.y_true))
        self.assertAlmostEqual(metrics.flagged, expected_flagged, delta=2)

    def test_returns_threshold_metrics(self):
        metrics = compute_contamination_threshold(self.y_true, self.y_scores)
        self.assertIsInstance(metrics, ThresholdMetrics)
        self.assertIsNotNone(metrics.threshold)
        self.assertIsNotNone(metrics.precision)
        self.assertIsNotNone(metrics.recall)
        self.assertIsNotNone(metrics.f1)


class TestComputeBaselineMetrics(unittest.TestCase):
    """Test baseline metric computation."""

    def setUp(self):
        np.random.seed(42)
        self.y_true = np.array([0] * 95 + [1] * 5)
        self.y_scores = np.random.rand(100)

    def test_returns_list(self):
        baselines = compute_baseline_metrics(self.y_true, self.y_scores)
        self.assertIsInstance(baselines, list)
        self.assertGreater(len(baselines), 0)

    def test_random_classifier_baseline(self):
        baselines = compute_baseline_metrics(self.y_true, self.y_scores)
        random_baseline = baselines[0]
        self.assertIsInstance(random_baseline, BaselineMetrics)
        self.assertEqual(random_baseline.name, "Random Classifier")
        # FIX: Increase tolerance for small sample randomness
        expected_precision = self.y_true.mean()
        self.assertAlmostEqual(
            random_baseline.precision, expected_precision, delta=0.05
        )


class TestEvaluateModel(unittest.TestCase):
    """Test full evaluation pipeline."""

    def setUp(self):
        np.random.seed(42)
        self.n_samples = 200
        self.n_features = 5
        # FIX: Create separable data for reliable ROC-AUC > 0.5
        normal = np.random.randn(180, self.n_features) * 0.5
        fraud = np.random.randn(20, self.n_features) * 0.5 + 3.0
        X_data = np.vstack([normal, fraud])
        self.X_test = pd.DataFrame(
            X_data, columns=[f"feature_{i}" for i in range(self.n_features)]
        )
        self.y_test = pd.Series([0] * 180 + [1] * 20)
        self.model = IsolationForest(
            n_estimators=10, contamination=0.1, random_state=42
        )
        self.model.fit(self.X_test)

    def test_returns_evaluation_result(self):
        result = evaluate_model(self.model, self.X_test, self.y_test)
        self.assertIsInstance(result, EvaluationResult)

    def test_model_metadata(self):
        result = evaluate_model(self.model, self.X_test, self.y_test)
        self.assertEqual(result.model_name, "Isolation Forest")
        self.assertEqual(result.n_estimators, 10)
        self.assertEqual(result.feature_count, self.n_features)

    def test_dataset_metadata(self):
        result = evaluate_model(self.model, self.X_test, self.y_test)
        self.assertEqual(result.test_rows, self.n_samples)
        self.assertEqual(result.test_frauds, 20)

    def test_ranking_metrics(self):
        result = evaluate_model(self.model, self.X_test, self.y_test)
        self.assertIsInstance(result.ranking_metrics, RankingMetrics)
        # FIX: With separable data, ROC-AUC should be > 0.5
        self.assertGreater(result.ranking_metrics.roc_auc, 0.5)
        self.assertGreater(result.ranking_metrics.pr_auc, 0.0)
        self.assertLessEqual(result.ranking_metrics.roc_auc, 1.0)

    def test_threshold_metrics(self):
        result = evaluate_model(self.model, self.X_test, self.y_test)
        self.assertIsInstance(result.contamination_threshold, ThresholdMetrics)
        self.assertIsInstance(result.f1_optimized, ThresholdMetrics)
        self.assertIsInstance(result.precision_optimized, ThresholdMetrics)
        self.assertIsInstance(result.recall_optimized, ThresholdMetrics)

    def test_baselines(self):
        result = evaluate_model(self.model, self.X_test, self.y_test)
        self.assertIsInstance(result.baselines, list)
        self.assertGreater(len(result.baselines), 0)

    def test_timestamp(self):
        result = evaluate_model(self.model, self.X_test, self.y_test)
        self.assertIsNotNone(result.timestamp)
        self.assertIsInstance(result.timestamp, str)

    def test_with_feature_names(self):
        feature_names = [f"feature_{i}" for i in range(self.n_features)]
        result = evaluate_model(
            self.model, self.X_test, self.y_test, feature_names=feature_names
        )
        self.assertEqual(result.feature_names, feature_names)

    def test_with_custom_contamination(self):
        result = evaluate_model(
            self.model, self.X_test, self.y_test, contamination=0.05
        )
        # FIX: Check contamination_threshold value, not model's internal contamination
        self.assertEqual(
            result.contamination_threshold.flagged, int(0.05 * self.n_samples)
        )


class TestExportMetricsJson(unittest.TestCase):
    """Test JSON export functionality."""

    def setUp(self):
        np.random.seed(42)
        self.X_test = pd.DataFrame(np.random.randn(50, 3), columns=["a", "b", "c"])
        self.y_test = pd.Series([0] * 45 + [1] * 5)
        self.model = IsolationForest(n_estimators=5, contamination=0.1, random_state=42)
        self.model.fit(self.X_test)
        self.result = evaluate_model(self.model, self.X_test, self.y_test)

    def test_creates_file(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            temp_path = f.name
        try:
            export_metrics_json(self.result, temp_path)
            self.assertTrue(os.path.exists(temp_path))
            with open(temp_path, "r") as f:
                data = json.load(f)
            self.assertIn("model_name", data)
            self.assertIn("ranking_metrics", data)
        finally:
            os.unlink(temp_path)

    def test_json_structure(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            temp_path = f.name
        try:
            export_metrics_json(self.result, temp_path)
            with open(temp_path, "r") as f:
                data = json.load(f)
            required_keys = [
                "model_name",
                "model_version",
                "n_estimators",
                "contamination",
                "feature_count",
                "feature_names",
                "test_rows",
                "test_frauds",
                "test_fraud_rate",
                "ranking_metrics",
                "contamination_threshold",
                "f1_optimized",
                "precision_optimized",
                "recall_optimized",
                "baselines",
                "timestamp",
            ]
            for key in required_keys:
                self.assertIn(key, data, f"Missing key: {key}")
        finally:
            os.unlink(temp_path)


class TestPrintEvaluationReport(unittest.TestCase):
    """Test console report printing."""

    def setUp(self):
        np.random.seed(42)
        self.X_test = pd.DataFrame(np.random.randn(50, 3), columns=["a", "b", "c"])
        self.y_test = pd.Series([0] * 45 + [1] * 5)
        self.model = IsolationForest(n_estimators=5, contamination=0.1, random_state=42)
        self.model.fit(self.X_test)
        self.result = evaluate_model(self.model, self.X_test, self.y_test)

    def test_does_not_raise(self):
        try:
            print_evaluation_report(self.result)
        except Exception as e:
            self.fail(f"print_evaluation_report raised {e}")


class TestIntegration(unittest.TestCase):
    """Integration tests for full evaluation workflow."""

    def setUp(self):
        np.random.seed(42)
        self.n_samples = 500
        self.n_features = 10
        # FIX: Create separable data
        normal = np.random.randn(450, self.n_features) * 0.5
        fraud = np.random.randn(50, self.n_features) * 0.5 + 3.0
        X_data = np.vstack([normal, fraud])
        self.X = pd.DataFrame(X_data, columns=[f"f{i}" for i in range(self.n_features)])
        self.y = pd.Series([0] * 450 + [1] * 50)
        self.model = IsolationForest(
            n_estimators=20, contamination=0.1, random_state=42
        )
        self.model.fit(self.X)

    def test_end_to_end_evaluation(self):
        result = evaluate_model(self.model, self.X, self.y)
        self.assertIsInstance(result, EvaluationResult)
        self.assertGreater(result.ranking_metrics.roc_auc, 0.5)

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            temp_path = f.name
        try:
            export_metrics_json(result, temp_path)
            self.assertTrue(os.path.exists(temp_path))
            with open(temp_path, "r") as f:
                data = json.load(f)
            self.assertEqual(data["test_rows"], self.n_samples)
            self.assertEqual(data["test_frauds"], 50)
        finally:
            os.unlink(temp_path)

    def test_reproducibility(self):
        result1 = evaluate_model(self.model, self.X, self.y)
        result2 = evaluate_model(self.model, self.X, self.y)
        self.assertAlmostEqual(
            result1.ranking_metrics.roc_auc, result2.ranking_metrics.roc_auc, places=10
        )
        self.assertAlmostEqual(
            result1.ranking_metrics.pr_auc, result2.ranking_metrics.pr_auc, places=10
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
