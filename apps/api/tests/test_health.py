def test_health_check_returns_ok(client):
    """
    Confirms the /api/v1/health endpoint is reachable and returns
    the expected shape. This is the first automated test in the
    project -- from now on, running `pytest` after any change tells
    us immediately if we've broken the most basic contract: "the
    server responds correctly."
    """
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "definitely_broken"
    assert body["environment"] == "development"