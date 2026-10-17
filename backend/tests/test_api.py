from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_demo_soul():

    response = client.get("/api/soul/demo")

    assert response.status_code == 200
    assert response.json()["name"] == "Giga"


def test_chat():

    response = client.post(
        "/api/soul/chat",
        json={
            "message": "Do you trust Bob?"
        }
    )

    assert response.status_code == 200
    assert "reply" in response.json()


def test_choice():

    response = client.post(
        "/api/soul/choice",
        json={
            "action": "help"
        }
    )

    assert response.status_code == 200
    assert response.json()["memory_created"] is True


def test_battle():

    response = client.post(
        "/api/arena/battle"
    )

    assert response.status_code == 200
    assert "win" in response.json()