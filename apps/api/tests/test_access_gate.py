import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.v1.access_gate import FAILED_ATTEMPTS


@pytest.fixture(autouse=True)
def clear_failed_attempts():
    FAILED_ATTEMPTS.clear()
    yield
    FAILED_ATTEMPTS.clear()


def test_access_gate_status_unauthorized():
    client = TestClient(app)
    resp = client.get("/api/v1/access-gate/status")
    assert resp.status_code == 200
    assert resp.json()["has_access"] is False


def test_access_gate_invalid_code():
    client = TestClient(app)
    resp = client.post("/api/v1/access-gate/verify", json={"access_code": "WRONG_PASSWORD_XYZ"})
    assert resp.status_code == 401
    assert "ACCESS CODE DENIED" in resp.json()["detail"]


def test_access_gate_valid_code():
    from app.core.config import get_settings
    client = TestClient(app)
    valid_code = get_settings().event_access_code
    resp = client.post("/api/v1/access-gate/verify", json={"access_code": valid_code})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "token" in data
    assert "event_access_token" in resp.cookies

    # Status check with cookie
    status_resp = client.get("/api/v1/access-gate/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["has_access"] is True


def test_access_gate_rate_limiting():
    client = TestClient(app)
    # 5 failed attempts
    for _ in range(5):
        resp = client.post("/api/v1/access-gate/verify", json={"access_code": "WRONG_CODE"})
        assert resp.status_code == 401

    # 6th attempt triggers rate limit
    limit_resp = client.post("/api/v1/access-gate/verify", json={"access_code": "WRONG_CODE"})
    assert limit_resp.status_code == 429
    assert "Rate limit exceeded" in limit_resp.json()["detail"]
