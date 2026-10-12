from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def restore_activities():
    original_activities = deepcopy(activities)
    yield
    activities.clear()
    activities.update(original_activities)


def test_root_redirects_to_frontend(client):
    response = client.get("/", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_get_activities_returns_activity_details(client):
    response = client.get("/activities")

    assert response.status_code == 200
    assert response.json()["Chess Club"]["participants"] == [
        "michael@mergington.edu",
        "daniel@mergington.edu",
    ]
    assert "Basketball Team" in response.json()


def test_signup_adds_participant(client):
    activity_name = "Art Club"
    email = "student@example.edu"

    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    assert response.status_code == 200
    assert response.json()["message"] == f"Signed up {email} for {activity_name}"
    assert email in client.get("/activities").json()[activity_name]["participants"]


def test_signup_rejects_duplicate_participant(client):
    activity_name = "Chess Club"
    email = "michael@mergington.edu"

    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Student is already signed up for this activity"
    assert activities[activity_name]["participants"].count(email) == 1


def test_signup_rejects_unknown_activity(client):
    response = client.post(
        "/activities/Unknown/signup",
        params={"email": "student@example.edu"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_removes_participant(client):
    activity_name = "Chess Club"
    email = "michael@mergington.edu"

    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    assert response.status_code == 200
    assert response.json()["message"] == f"Unregistered {email} from {activity_name}"
    assert email not in client.get("/activities").json()[activity_name]["participants"]


def test_unregister_rejects_unknown_activity(client):
    response = client.delete(
        "/activities/Unknown/signup",
        params={"email": "student@example.edu"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_rejects_unregistered_participant(client):
    activity_name = "Art Club"
    email = "student@example.edu"

    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"