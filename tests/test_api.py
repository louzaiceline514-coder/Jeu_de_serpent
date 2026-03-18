"""Tests d'intégration simples pour l'API FastAPI."""

import asyncio
import sys
from pathlib import Path

from httpx import ASGITransport, AsyncClient

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402


async def _request(method: str, path: str) -> tuple[int, dict | list]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.request(method, path)
    return response.status_code, response.json()


def test_health_route():
    status_code, data = asyncio.run(_request("GET", "/api/health"))
    assert status_code == 200
    assert data["status"] == "ok"


def test_game_lifecycle():
    status_code, data = asyncio.run(_request("POST", "/api/game/start"))
    assert status_code == 200
    assert "state" in data
    step_status, _ = asyncio.run(_request("POST", "/api/game/step"))
    assert step_status == 200
    state_status, _ = asyncio.run(_request("GET", "/api/game/state"))
    assert state_status == 200


def test_stats_comparison_endpoint():
    status_code, data = asyncio.run(_request("GET", "/api/stats/comparison"))
    assert status_code == 200
    assert "astar" in data
    assert "rl" in data


def test_agents_listing_and_stats():
    status_code, agents = asyncio.run(_request("GET", "/api/agents"))
    assert status_code == 200
    assert isinstance(agents, list)
    if agents:
        agent_id = agents[0]["id"]
        stats_status, stats = asyncio.run(_request("GET", f"/api/agents/{agent_id}/stats"))
        assert stats_status == 200
        assert stats["agent_id"] == agent_id
