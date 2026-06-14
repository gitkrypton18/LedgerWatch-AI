"""
LedgerWatch AI — Backend API Tests
Day 15: Comprehensive pytest suite for all FastAPI endpoints
Run: pytest tests/test_api.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from src.database import Base, get_db

# ─── Test Database Setup ──────────────────────────────────────
TEST_DB_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Override dependency
@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ─── Test Data ────────────────────────────────────────────────
VALID_TRANSACTION = {
    "step": 1,
    "type": "TRANSFER",
    "amount": 181.0,
    "nameOrig": "C1231006815",
    "oldbalanceOrg": 181.0,
    "newbalanceOrig": 0.0,
    "nameDest": "C1970109150",
    "oldbalanceDest": 0.0,
    "newbalanceDest": 0.0,
}

INVALID_TRANSACTION = {
    "step": 1,
    "type": "INVALID_TYPE",
    "amount": -100,
    "nameOrig": "",
    "oldbalanceOrg": 0,
    "newbalanceOrig": 0,
    "nameDest": "",
    "oldbalanceDest": 0,
    "newbalanceDest": 0,
}

API_KEY = "demo-key-123"
HEADERS = {"X-API-Key": API_KEY}

# ═══════════════════════════════════════════════════════════════
# 1. HEALTH CHECK
# ═══════════════════════════════════════════════════════════════


class TestHealth:
    def test_health_no_auth(self, client):
        """Health check should NOT require API key"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "model_loaded" in data
        assert "ocr_available" in data

    def test_health_method_not_allowed(self, client):
        response = client.post("/health")
        assert response.status_code == 405


# ═══════════════════════════════════════════════════════════════
# 2. STATS
# ═══════════════════════════════════════════════════════════════


class TestStats:
    def test_stats_with_auth(self, client):
        response = client.get("/stats", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "total_transactions" in data
        assert "anomalies_detected" in data
        assert "anomaly_rate" in data

    def test_stats_without_auth(self, client):
        """Stats should require API key"""
        response = client.get("/stats")
        assert response.status_code == 403

    def test_stats_invalid_api_key(self, client):
        response = client.get("/stats", headers={"X-API-Key": "wrong-key"})
        assert response.status_code == 403


# ═══════════════════════════════════════════════════════════════
# 3. PREDICT (Single Transaction)
# ═══════════════════════════════════════════════════════════════


class TestPredict:
    def test_predict_without_explain(self, client):
        response = client.post(
            "/predict?explain=false", json=VALID_TRANSACTION, headers=HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert "risk_score" in data
        assert "risk_band" in data
        assert "is_anomaly" in data
        assert isinstance(data["is_anomaly"], bool)
        assert 0 <= data["risk_score"] <= 100
        assert data["risk_band"] in ["Low", "Medium", "High", "Critical"]

    def test_predict_with_explain(self, client):
        response = client.post(
            "/predict?explain=true", json=VALID_TRANSACTION, headers=HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert "shap_values" in data
        assert isinstance(data["shap_values"], dict)
        assert len(data["shap_values"]) > 0
        for key, val in data["shap_values"].items():
            assert isinstance(val, (int, float))

    def test_predict_without_auth(self, client):
        response = client.post("/predict", json=VALID_TRANSACTION)
        assert response.status_code == 403

    def test_predict_invalid_data(self, client):
        response = client.post("/predict", json=INVALID_TRANSACTION, headers=HEADERS)
        assert response.status_code == 422

    def test_predict_missing_fields(self, client):
        incomplete = {"step": 1, "type": "TRANSFER"}
        response = client.post("/predict", json=incomplete, headers=HEADERS)
        assert response.status_code == 422


# ═══════════════════════════════════════════════════════════════
# 4. BATCH PREDICT
# ═══════════════════════════════════════════════════════════════


class TestBatchPredict:
    def test_batch_predict_csv(self, client):
        csv_content = (
            "step,type,amount,nameOrig,oldbalanceOrg,newbalanceOrig,nameDest,oldbalanceDest,newbalanceDest\n"
            "1,TRANSFER,181,C123,181,0,C456,0,0\n"
            "2,PAYMENT,1000,C789,5000,4000,M123,0,0"
        )
        import io

        file = io.BytesIO(csv_content.encode())
        file.name = "test.csv"
        response = client.post(
            "/batch-predict",
            files={"file": ("test.csv", file, "text/csv")},
            headers=HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_processed" in data
        assert "anomalies_detected" in data
        assert "results" in data
        assert isinstance(data["results"], list)
        assert len(data["results"]) == 2

    def test_batch_predict_invalid_format(self, client):
        import io

        file = io.BytesIO(b"invalid content")
        file.name = "test.txt"
        response = client.post(
            "/batch-predict",
            files={"file": ("test.txt", file, "text/plain")},
            headers=HEADERS,
        )
        assert response.status_code == 400

    def test_batch_predict_without_auth(self, client):
        import io

        file = io.BytesIO(b"test")
        response = client.post(
            "/batch-predict", files={"file": ("test.csv", file, "text/csv")}
        )
        assert response.status_code == 403


# ═══════════════════════════════════════════════════════════════
# 5. OCR
# ═══════════════════════════════════════════════════════════════


class TestOCR:
    def test_ocr_without_auth(self, client):
        import io

        file = io.BytesIO(b"fake image data")
        response = client.post("/ocr", files={"file": ("test.png", file, "image/png")})
        assert response.status_code == 403

    def test_ocr_invalid_format(self, client):
        import io

        file = io.BytesIO(b"not an image")
        response = client.post(
            "/ocr", files={"file": ("test.txt", file, "text/plain")}, headers=HEADERS
        )
        assert response.status_code == 400


# ═══════════════════════════════════════════════════════════════
# 6. TRANSACTIONS (List)
# ═══════════════════════════════════════════════════════════════


class TestTransactions:
    def test_get_transactions_default(self, client):
        response = client.get("/transactions", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "count" in data
        assert isinstance(data["transactions"], list)
        assert isinstance(data["count"], int)

    def test_get_transactions_with_pagination(self, client):
        response = client.get("/transactions?limit=5&offset=0", headers=HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert len(data["transactions"]) <= 5

    def test_get_transactions_invalid_limit(self, client):
        response = client.get("/transactions?limit=99999", headers=HEADERS)
        assert response.status_code == 422

    def test_get_transactions_without_auth(self, client):
        response = client.get("/transactions")
        assert response.status_code == 403


# ═══════════════════════════════════════════════════════════════
# 7. TRANSACTION BY ID
# ═══════════════════════════════════════════════════════════════


class TestTransactionById:
    def test_get_transaction_by_id(self, client):
        response = client.post(
            "/predict?explain=false", json=VALID_TRANSACTION, headers=HEADERS
        )
        assert response.status_code == 200
        response = client.get("/transactions?limit=1", headers=HEADERS)
        data = response.json()
        if len(data["transactions"]) > 0:
            tx_id = data["transactions"][0]["id"]
            response = client.get(f"/transactions/{tx_id}", headers=HEADERS)
            assert response.status_code == 200
            tx = response.json()
            assert "id" in tx
            assert "type" in tx
            assert "amount" in tx

    def test_get_transaction_not_found(self, client):
        response = client.get("/transactions/999999", headers=HEADERS)
        assert response.status_code == 404

    def test_get_transaction_without_auth(self, client):
        response = client.get("/transactions/1")
        assert response.status_code == 403


# ═══════════════════════════════════════════════════════════════
# 8. CORS & SECURITY
# ═══════════════════════════════════════════════════════════════


class TestCORS:
    def test_cors_headers(self, client):
        response = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers

    def test_cors_preflight_post(self, client):
        response = client.options(
            "/predict",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "X-API-Key, Content-Type",
            },
        )
        assert response.status_code == 200


# ═══════════════════════════════════════════════════════════════
# 9. PERFORMANCE
# ═══════════════════════════════════════════════════════════════


class TestPerformance:
    def test_predict_response_time(self, client):
        import time

        start = time.time()
        response = client.post(
            "/predict?explain=false", json=VALID_TRANSACTION, headers=HEADERS
        )
        elapsed = time.time() - start
        assert response.status_code == 200
        assert elapsed < 5.0

    def test_health_response_time(self, client):
        import time

        start = time.time()
        response = client.get("/health")
        elapsed = time.time() - start
        assert response.status_code == 200
        assert elapsed < 1.0


# ═══════════════════════════════════════════════════════════════
# 10. ERROR HANDLING
# ═══════════════════════════════════════════════════════════════


class TestErrorHandling:
    def test_404_not_found(self, client):
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404

    def test_405_method_not_allowed(self, client):
        response = client.delete("/health")
        assert response.status_code == 405

    def test_malformed_json(self, client):
        response = client.post(
            "/predict",
            data="not json",
            headers={**HEADERS, "Content-Type": "application/json"},
        )
        assert response.status_code == 422

    def test_empty_request_body(self, client):
        response = client.post("/predict", json={}, headers=HEADERS)
        assert response.status_code == 422

    def test_large_payload(self, client):
        """Test with a batch of 100 transactions"""
        import io

        rows = [
            "step,type,amount,nameOrig,oldbalanceOrg,newbalanceOrig,nameDest,oldbalanceDest,newbalanceDest"
        ]
        for i in range(100):
            rows.append(f"{i},TRANSFER,100,C{i},100,0,D{i},0,0")
        csv_content = "\n".join(rows)
        file = io.BytesIO(csv_content.encode())
        file.name = "large.csv"
        response = client.post(
            "/batch-predict",
            files={"file": ("large.csv", file, "text/csv")},
            headers=HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_processed"] == 100
