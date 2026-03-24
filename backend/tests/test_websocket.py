"""Tests d'intégration WebSocket : connexion, commandes, flux de jeu."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from starlette.testclient import TestClient

from main import app


@pytest.fixture()
def ws_client():
    return TestClient(app)


def test_ws_connexion_etat_initial(ws_client):
    """À la connexion, le serveur envoie immédiatement un game_state."""
    with ws_client.websocket_connect("/ws") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "game_state"
        assert "payload" in msg
        payload = msg["payload"]
        assert "snake" in payload
        assert "score" in payload
        assert payload["score"] == 0
        assert payload["step_count"] == 0


def test_ws_reset(ws_client):
    """Après un reset, score et step_count reviennent à 0."""
    with ws_client.websocket_connect("/ws") as ws:
        ws.receive_json()  # état initial
        ws.send_json({"type": "reset"})
        msg = ws.receive_json()
        assert msg["type"] == "game_state"
        assert msg["payload"]["score"] == 0
        assert msg["payload"]["step_count"] == 0


def test_ws_set_mode_astar(ws_client):
    """Changer le mode en astar → game_state reçu sans erreur."""
    with ws_client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "set_mode", "mode": "astar"})
        msg = ws.receive_json()
        assert msg["type"] == "game_state"
        assert msg["payload"]["mode"] == "astar"


def test_ws_set_mode_rl(ws_client):
    """Changer le mode en rl → game_state reçu sans erreur."""
    with ws_client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "set_mode", "mode": "rl"})
        msg = ws.receive_json()
        assert msg["type"] == "game_state"
        assert msg["payload"]["mode"] == "rl"


def test_ws_direction_valide(ws_client):
    """Envoyer une direction UP ne provoque pas de crash."""
    with ws_client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "direction", "dir": "UP"})
        msg = ws.receive_json()
        assert msg["type"] == "game_state"


def test_ws_direction_invalide_ignoree(ws_client):
    """Une direction invalide est ignorée, le jeu continue normalement."""
    with ws_client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "direction", "dir": "INVALID"})
        msg = ws.receive_json()
        assert msg["type"] == "game_state"


def test_ws_set_speed(ws_client):
    """Changer la vitesse → game_state reçu sans erreur."""
    with ws_client.websocket_connect("/ws") as ws:
        ws.receive_json()
        ws.send_json({"type": "set_speed", "speed": 50})
        msg = ws.receive_json()
        assert msg["type"] == "game_state"


def test_ws_payload_champs_requis(ws_client):
    """Le payload contient tous les champs attendus par le frontend."""
    with ws_client.websocket_connect("/ws") as ws:
        msg = ws.receive_json()
        payload = msg["payload"]
        for field in ("snake", "food", "obstacles", "score", "game_over", "mode", "step_count"):
            assert field in payload, f"Champ manquant dans le payload : {field}"
