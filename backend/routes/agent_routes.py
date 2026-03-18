"""Routes REST pour interagir directement avec les agents IA."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.agent_astar import AgentAStar
from agents.agent_rl import AgentQL
from config import EPSILON_MIN
from game_engine.direction import Direction
from game_engine.moteur import MoteurJeu

router = APIRouter(prefix="/api/agent", tags=["agent"])


class AgentStepRequest(BaseModel):
    """Requete pour faire avancer un agent d'un tick."""

    agent_type: str
    game_state: dict[str, Any]


class AgentInitRequest(BaseModel):
    """Requete pour initialiser un moteur de jeu pour un agent."""

    mode: str = "battle"


def _direction_from_name(name: str | None) -> Direction:
    if not name:
        return Direction.DROITE
    try:
        return Direction[name]
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=f"Direction invalide: {name}") from exc


def _restore_engine(state: dict[str, Any]) -> MoteurJeu:
    moteur = MoteurJeu()
    moteur.reset(mode=state.get("mode", "manual"))
    moteur.score = int(state.get("score", 0))
    moteur.game_over = bool(state.get("game_over", state.get("gameOver", False)))
    moteur.step_count = int(state.get("step_count", state.get("stepCount", 0)))

    snake = state.get("snake") or []
    moteur.serpent.corps = [
        (int(segment["x"]), int(segment["y"])) for segment in snake if "x" in segment and "y" in segment
    ] or list(moteur.serpent.corps)
    moteur.serpent.direction = _direction_from_name(state.get("direction"))
    moteur.serpent.croissance_en_attente = bool(
        state.get("growth_pending", state.get("growthPending", False))
    )

    if len(moteur.serpent.corps) > 1:
        head_x, head_y = moteur.serpent.corps[0]
        neck_x, neck_y = moteur.serpent.corps[1]
        dx = head_x - neck_x
        dy = head_y - neck_y
        for direction in Direction:
            if (direction.dx, direction.dy) == (dx, dy):
                moteur.serpent.direction = direction
                break

    dynamic_obstacles = {
        (int(obs["x"]), int(obs["y"])): int(obs.get("age", 0))
        for obs in (state.get("dynamic_obstacles") or [])
        if "x" in obs and "y" in obs
    }
    all_obstacles = {
        (int(obs["x"]), int(obs["y"]))
        for obs in (state.get("obstacles") or [])
        if "x" in obs and "y" in obs
    }
    moteur.dynamic_obstacles = dynamic_obstacles
    moteur.static_obstacles = all_obstacles - set(dynamic_obstacles)
    moteur._refresh_obstacles()
    food = state.get("food")
    moteur.grille.nourriture = (int(food["x"]), int(food["y"])) if food else None
    return moteur


def _select_agent(agent_type: str) -> Any:
    if agent_type == "astar":
        return AgentAStar()
    if agent_type == "rl":
        return AgentQL(epsilon=EPSILON_MIN)
    raise HTTPException(status_code=400, detail=f"Agent type non supporte: {agent_type}")


@router.post("/init")
def init_agent_game(request: AgentInitRequest) -> dict:
    """Initialise un etat de jeu cohérent directement depuis le backend."""

    moteur = MoteurJeu()
    moteur.reset(mode=request.mode)
    return {
        "payload": moteur.get_state_dict(),
    }


@router.post("/step")
def agent_step(request: AgentStepRequest) -> dict:
    """Fait avancer un agent d'un tick et retourne le nouvel etat."""

    moteur = _restore_engine(request.game_state)
    agent = _select_agent(request.agent_type)

    if not moteur.game_over:
        direction = agent.choisir_action({"engine": moteur})
        moteur.changer_direction(direction)
        moteur.step()

    return {
        "payload": moteur.get_state_dict(),
    }
