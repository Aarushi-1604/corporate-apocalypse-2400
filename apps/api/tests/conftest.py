import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture #reusable code setup
def client() -> TestClient:
    '''
    This provides a TestClient wired to the FastAPI app for any test that asks for a 'client' argument.
    Instead of writing `TestClient(app)` at the top of every single test file, every
    test just declares `client` as a parameter, and pytest
    automatically calls this function and hands over the result.
    conftest.py is a special filename pytest auto-discovers -- any
    fixture defined here is available to every test file in this
    folder without needing to import it manually.
    '''
    return TestClient(app)