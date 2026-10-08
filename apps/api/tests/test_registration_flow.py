import pytest
import uuid

def test_sit_student_registration_flow(client):
    unique_prn = f"SIT-2400-{uuid.uuid4().hex[:6]}"
    payload = {
        "registration_type": "SIT",
        "full_name": "Symbi Tech Executive",
        "prn": unique_prn,
        "email": "executive@sitpune.edu.in",
        "department": "Computer Science Engineering",
        "year_of_study": "Year 2"
    }

    response = client.post("/api/v1/players/register", json=payload)
    assert response.status_code == 200, f"Registration failed: {response.text}"
    
    data = response.json()
    assert "player_id" in data
    assert "session_id" in data
    assert "company" in data
    
    company = data["company"]
    assert "name" in company
    assert "sector" in company
    assert company["cash"] > 0
    assert data["resumed"] is False

    # Test duplicate SIT registration resumes existing session
    resume_response = client.post("/api/v1/players/register", json=payload)
    assert resume_response.status_code == 200
    resume_data = resume_response.json()
    assert resume_data["player_id"] == data["player_id"]
    assert resume_data["resumed"] is True

def test_sit_email_domain_validation(client):
    payload = {
        "registration_type": "SIT",
        "full_name": "Invalid Domain User",
        "prn": f"PRN-{uuid.uuid4().hex[:6]}",
        "email": "student@gmail.com",
        "department": "Computer Science Engineering",
        "year_of_study": "Year 1"
    }

    response = client.post("/api/v1/players/register", json=payload)
    assert response.status_code in (400, 422), "Should reject non-sitpune email domain"

def test_non_sit_student_registration_flow(client):
    unique_phone = f"+9198{uuid.uuid4().int % 100000000:08d}"
    payload = {
        "registration_type": "NON_SIT",
        "full_name": "External Guest Executive",
        "phone_number": unique_phone,
        "institution_name": "Stanford University"
    }

    response = client.post("/api/v1/players/register", json=payload)
    assert response.status_code == 200, f"Non-SIT registration failed: {response.text}"

    data = response.json()
    assert "player_id" in data
    assert "session_id" in data
    assert "company" in data
    assert data["resumed"] is False

    # Test duplicate Non-SIT registration with same phone resumes existing session
    resume_response = client.post("/api/v1/players/register", json=payload)
    assert resume_response.status_code == 200
    resume_data = resume_response.json()
    assert resume_data["player_id"] == data["player_id"]
    assert resume_data["resumed"] is True


