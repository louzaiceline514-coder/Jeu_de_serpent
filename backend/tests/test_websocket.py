"""Tests d'intégration WebSocket : connexion, commandes, flux de jeu."""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import orjson
import pytest
from starlette.testclient import TestClient

from main import app


@pytest.fixture()
def ws_client():
    return TestClient(app)


def recv_ws(ws) -> dict:
    """Reçoit un message WebSocket (bytes ou text) et retourne le dict parsé.

    Le backend envoie désormais des messages binaires via orjson.dumps()
    (websocket.send_bytes). Cette aide centralise le décodage.
    """
    try:
        data = ws.receive_bytes()
        return orjson.loads(data)
    except Exception:
        # Fallback text (compatibilité avec d'éventuels messages textuels)
        return ws.receive_json()


def test_ws_connexion_etat_initial(ws_client):
    """À la connexion, le serveur envoie immédiatement un game_state complet."""
    with ws_client.websocket_connect("/ws") as ws:
        msg = recv_ws(ws)
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
        recv_ws(ws)  # état initial
        ws.send_json({"type": "reset"})
        msg = recv_ws(ws)
        # Après reset, _static_sent = False → prochain message est game_state complet
        assert msg["type"] == "game_state"
        assert msg["payload"]["score"] == 0
        assert msg["payload"]["step_count"] == 0


def test_ws_set_mode_astar(ws_client):
    """Changer le mode en astar → game_state complet reçu avec mode correct."""
    with ws_client.websocket_connect("/ws") as ws:
        recv_ws(ws)
        ws.send_json({"type": "set_mode", "mode": "astar"})
        msg = recv_ws(ws)
        assert msg["type"] == "game_state"
        assert msg["payload"]["mode"] == "astar"


def test_ws_set_mode_rl(ws_client):
    """Changer le mode en rl → game_state reçu sans erreur."""
    with ws_client.websocket_connect("/ws") as ws:
        recv_ws(ws)
        ws.send_json({"type": "set_mode", "mode": "rl"})
        msg = recv_ws(ws)
        assert msg["type"] == "game_state"
        assert msg["payload"]["mode"] == "rl"


def test_ws_direction_valide(ws_client):
    """Envoyer une direction UP ne provoque pas de crash."""
    with ws_client.websocket_connect("/ws") as ws:
        recv_ws(ws)
        ws.send_json({"type": "direction", "dir": "UP"})
        msg = recv_ws(ws)
        assert msg["type"] in ("game_state", "game_delta")


def test_ws_direction_invalide_ignoree(ws_client):
    """Une direction invalide est ignorée, le jeu continue normalement."""
    with ws_client.websocket_connect("/ws") as ws:
        recv_ws(ws)
        ws.send_json({"type": "direction", "dir": "INVALID"})
        msg = recv_ws(ws)
        assert msg["type"] in ("game_state", "game_delta")


def test_ws_set_speed(ws_client):
    """Changer la vitesse → message reçu sans erreur."""
    with ws_client.websocket_connect("/ws") as ws:
        recv_ws(ws)
        ws.send_json({"type": "set_speed", "speed": 50})
        msg = recv_ws(ws)
        assert msg["type"] in ("game_state", "game_delta")


def test_ws_payload_champs_requis(ws_client):
    """Le payload initial contient tous les champs attendus par le frontend."""
    with ws_client.websocket_connect("/ws") as ws:
        msg = recv_ws(ws)
        assert msg["type"] == "game_state"
        payload = msg["payload"]
        for field in ("snake", "food", "obstacles", "score", "game_over", "mode", "step_count"):
            assert field in payload, f"Champ manquant dans le payload : {field}"


def test_ws_payload_champs_nouveaux(ws_client):
    """Le payload initial contient les nouveaux champs : etat, astar_path."""
    with ws_client.websocket_connect("/ws") as ws:
        msg = recv_ws(ws)
        payload = msg["payload"]
        assert "etat" in payload, "Champ 'etat' manquant (EtatJeu)"
        assert "astar_path" in payload, "Champ 'astar_path' manquant (F6)"
        assert payload["etat"] in ("en_cours", "game_over", "pause")
        assert isinstance(payload["astar_path"], list)


def test_ws_premier_message_est_complet(ws_client):
    """Le premier message est toujours un game_state complet (pas un delta)."""
    with ws_client.websocket_connect("/ws") as ws:
        msg = recv_ws(ws)
        assert msg["type"] == "game_state"
        # Un état complet doit contenir les champs statiques
        assert "obstacles" in msg["payload"]
        assert "taille_grille" in msg["payload"]
        assert "mode" in msg["payload"]


def test_ws_delta_apres_reset_envoie_etat_complet(ws_client):
    """Après un reset, le prochain message est un game_state complet (pas un delta)."""
    with ws_client.websocket_connect("/ws") as ws:
        recv_ws(ws)  # état initial complet
        ws.send_json({"type": "reset"})
        msg = recv_ws(ws)
        # _static_sent remis à False lors du reset → game_state obligatoire
        assert msg["type"] == "game_state"
        assert "obstacles" in msg["payload"]
