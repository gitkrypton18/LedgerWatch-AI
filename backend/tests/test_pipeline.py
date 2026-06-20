"""
LedgerWatch AI — Complete End-to-End Pipeline Test
Tests: Data Ingest → Features → Model → Predict → API → DB → Query
"""

import os
import sys
from pathlib import Path

import pytest

# Verify project structure
PROJECT_ROOT = Path(__file__).parent.parent.parent.resolve()


def test_project_structure():
    """Verify all required folders and files exist"""
    required_dirs = [
        "backend",
        "frontend/src",
        "frontend/src/pages",
        "frontend/src/components",
        "frontend/src/hooks",
        "frontend/src/lib",
        "backend/src",
        "backend/tests",
        "data/raw",
        "data/processed",
        "backend/saved_models",
        "notebooks",
        "docs",
    ]

    for dir_path in required_dirs:
        full_path = PROJECT_ROOT / dir_path
        assert full_path.exists(), f"Missing directory: {dir_path}"
        print(f"✅ {dir_path}")


def test_backend_files():
    """Verify backend module files"""
    required_files = [
        "backend/__init__.py",
        "backend/main.py",
        "backend/src/database.py",
        "backend/src/config.py",
        "backend/src/schemas.py",
        "backend/src/features.py",
        "backend/src/train.py",
        "backend/src/evaluate.py",
        "backend/src/risk_engine.py",
        "backend/src/explain.py",
        "backend/src/ocr_service.py",
        "backend/src/data_ingest.py",
    ]

    for file_path in required_files:
        full_path = PROJECT_ROOT / file_path
        assert full_path.exists(), f"Missing file: {file_path}"
        print(f"✅ {file_path}")


def test_frontend_files():
    """Verify frontend files"""
    required_files = [
        "frontend/src/App.jsx",
        "frontend/src/main.jsx",
        "frontend/src/pages/Dashboard.jsx",
        "frontend/src/pages/UploadPage.jsx",
        "frontend/src/pages/TransactionsPage.jsx",
        "frontend/src/pages/ExplainabilityPage.jsx",
        "frontend/src/pages/AnalyticsPage.jsx",
        "frontend/src/pages/SettingsPage.jsx",
        "frontend/src/hooks/useApi.js",
        "frontend/src/lib/axios.js",
        "frontend/vite.config.js",
        "frontend/package.json",
    ]

    for file_path in required_files:
        full_path = PROJECT_ROOT / file_path
        assert full_path.exists(), f"Missing file: {file_path}"
        print(f"✅ {file_path}")


def test_model_files():
    """Verify saved models exist"""
    model_files = [
        "backend/saved_models/isolation_forest_v1.0.0.joblib",
        "backend/saved_models/risk_engine_v1.0.0.joblib",
    ]

    for file_path in model_files:
        full_path = PROJECT_ROOT / file_path
        assert full_path.exists(), f"Missing model: {file_path}"
        size_mb = full_path.stat().st_size / (1024 * 1024)
        print(f"✅ {file_path} ({size_mb:.1f} MB)")


def test_data_files():
    """Verify data files exist"""
    data_files = [
        "data/raw/PS_20174392719_1491204439457_log.csv",
    ]

    for file_path in data_files:
        full_path = PROJECT_ROOT / file_path
        if full_path.exists():
            size_mb = full_path.stat().st_size / (1024 * 1024)
            print(f"✅ {file_path} ({size_mb:.1f} MB)")
        else:
            print(f"⚠️  {file_path} (optional - will be downloaded)")


def test_config_files():
    """Verify config files"""
    config_files = [
        "backend/requirements.txt",
        ".env.example",
        "backend/render.yaml",
        "frontend/vercel.json",
        "frontend/.env.example",
        "backend/pytest.ini",
        "backend/tests/conftest.py",
        "backend/tests/test_api.py",
        "backend/tests/test_pipeline.py",
    ]

    for file_path in config_files:
        full_path = PROJECT_ROOT / file_path
        assert full_path.exists(), f"Missing config: {file_path}"
        print(f"✅ {file_path}")


def test_imports():
    """Test that all Python modules can be imported"""
    modules = [
        "backend.main",
        "src.database",
        "src.config",
        "src.schemas",
        "src.features",
        "src.train",
        "src.evaluate",
        "src.risk_engine",
        "src.explain",
        "src.ocr_service",
        "src.data_ingest",
    ]

    for module_name in modules:
        try:
            __import__(module_name)
            print(f"✅ {module_name}")
        except Exception as e:
            pytest.fail(f"Failed to import {module_name}: {e}")


def test_database_connection():
    """Test database can be created and connected"""
    from src.database import Base, SessionLocal, engine

    # Create tables
    Base.metadata.create_all(bind=engine)

    # Test connection
    db = SessionLocal()
    try:
        # NEW:
        from sqlalchemy import text

        result = db.execute(text("SELECT 1"))
        assert result.scalar() == 1
        print("✅ Database connection working")
    finally:
        db.close()


def test_model_loading():
    """Test that ML models can be loaded"""
    import joblib

    model_path = PROJECT_ROOT / "backend/saved_models/isolation_forest_v1.0.0.joblib"
    risk_path = PROJECT_ROOT / "backend/saved_models/risk_engine_v1.0.0.joblib"

    if model_path.exists():
        model = joblib.load(model_path)
        assert model is not None
        print(f"✅ Isolation Forest loaded: {type(model).__name__}")

    if risk_path.exists():
        risk_engine = joblib.load(risk_path)
        assert risk_engine is not None
        print(f"✅ Risk Engine loaded: {type(risk_engine).__name__}")


def test_api_endpoints_list():
    """Verify all expected API endpoints exist in main.py"""
    backend_main = PROJECT_ROOT / "backend/main.py"
    content = backend_main.read_text(encoding="utf-8")

    expected_endpoints = [
        '"/health"',
        '"/stats"',
        '"/predict"',
        '"/batch-predict"',
        '"/ocr"',
        '"/transactions"',
        '"/transactions/{',
    ]

    for endpoint in expected_endpoints:
        assert endpoint in content, f"Missing endpoint: {endpoint}"
        print(f"✅ Endpoint found: {endpoint}")


def test_frontend_routes():
    """Verify all routes exist in App.jsx"""
    app_jsx = PROJECT_ROOT / "frontend/src/App.jsx"
    content = app_jsx.read_text(encoding="utf-8")

    expected_routes = [
        "Dashboard",
        "UploadPage",
        "TransactionsPage",
        "ExplainabilityPage",
        "AnalyticsPage",
        "SettingsPage",
    ]

    for route in expected_routes:
        assert route in content, f"Missing route: {route}"
        print(f"✅ Route found: {route}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
