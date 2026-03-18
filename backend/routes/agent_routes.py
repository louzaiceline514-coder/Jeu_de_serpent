"""Routes REST pour interagir directement avec les agents IA."""

from __future__ import annotations

import time
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


def _compute_safety_score(moteur: MoteurJeu, direction: Direction) -> float:
    grille = moteur.grille
    nx = moteur.serpent.tete[0] + direction.dx
    ny = moteur.serpent.tete[1] + direction.dy
    if not grille.est_dans_grille(nx, ny):
        return 0.0
    if (nx, ny) in grille.obstacles:
        return 0.0
    if (nx, ny) in list(moteur.serpent.corps)[1:]:
        return 0.0

    blocked = set(grille.obstacles) | set(moteur.serpent.corps[1:])
    stack = [(nx, ny)]
    visited: set[tuple[int, int]] = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in visited or (x, y) in blocked:
            continue
        visited.add((x, y))
        for voisin in grille.obtenir_voisins(x, y):
            if voisin not in visited and voisin not in blocked:
                stack.append(voisin)

    free_cells = (grille.largeur * grille.hauteur) - len(blocked)
    if free_cells <= 0:
        return 0.0
    return min(1.0, len(visited) / free_cells)


def _build_agent_message(agent_type: str, moteur: MoteurJeu, direction: Direction, safety_score: float) -> str:
    food = moteur.grille.nourriture
    next_head = (moteur.serpent.tete[0] + direction.dx, moteur.serpent.tete[1] + direction.dy)

    if agent_type == "astar":
        if food == next_head:
            return "Chemin optimal trouve vers la nourriture"
        if safety_score >= 0.65:
            return "Analyse de securite favorable, zone ouverte"
        return "Mode survie actif, sortie de piege privilegiee"

    if food == next_head:
        return "Exploitation de la Q-Table vers la nourriture"
    if safety_score < 0.35:
        return "Evitement de collision detecte"
    return "Politique stable dans une zone sure"


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
        started_at = time.perf_counter()
        direction = agent.choisir_action({"engine": moteur})
        inference_ms = (time.perf_counter() - started_at) * 1000.0
        safety_score = _compute_safety_score(moteur, direction)
        analysis = _build_agent_message(request.agent_type, moteur, direction, safety_score)
        moteur.changer_direction(direction)
        moteur.step()
    else:
        inference_ms = 0.0
        safety_score = 0.0
        analysis = "Partie terminee"

    return {
        "payload": moteur.get_state_dict(),
        "meta": {
            "agent_type": request.agent_type,
            "inference_ms": round(inference_ms, 3),
            "epsilon": round(float(getattr(agent, "epsilon", 0.0)), 4),
            "safety_score": round(safety_score, 4),
            "analysis": analysis,
        },
    }
