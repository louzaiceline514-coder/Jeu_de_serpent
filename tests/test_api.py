"""Tests d'intégration simples pour l'API FastAPI."""

import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402

client = TestClient(app)


def test_health_route():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_game_lifecycle():
    r = client.post("/api/game/start")
    assert r.status_code == 200
    data = r.json()
    assert "state" in data
    r2 = client.post("/api/game/step")
    assert r2.status_code == 200
    r3 = client.get("/api/game/state")
    assert r3.status_code == 200


def test_stats_comparison_endpoint():
    r = client.get("/api/stats/comparison")
    assert r.status_code == 200
    data = r.json()
    assert "astar" in data
    assert "rl" in data


def test_agents_listing_and_stats():
    r = client.get("/api/agents")
    assert r.status_code == 200
    agents = r.json()
    assert isinstance(agents, list)
    if agents:
        agent_id = agents[0]["id"]
        r2 = client.get(f"/api/agents/{agent_id}/stats")
        assert r2.status_code == 200
        stats = r2.json()
        assert stats["agent_id"] == agent_id

