"""Routes REST pour interagir directement avec les agents IA."""

from __future__ import annotations

from collections import deque
from time import perf_counter
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.agent_astar import AgentAStar
from agents.agent_rl import AgentQL
from config import EPSILON_MIN
from database import SessionLocal
from game_engine.direction import Direction
from game_engine.moteur import MoteurJeu
from models.agent import Agent
from models.game import Game
from models.stats import AgentStats

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


def _free_space_ratio(moteur: MoteurJeu) -> float:
    if moteur.game_over or not moteur.serpent.corps:
        return 0.0

    head = moteur.serpent.tete
    blocked = set(moteur.grille.obstacles) | set(moteur.serpent.corps[1:])
    if head in blocked:
        return 0.0

    queue = deque([head])
    visited = {head}

    while queue:
        x, y = queue.popleft()
        for nx, ny in moteur.grille.obtenir_voisins(x, y):
            if (nx, ny) in visited or (nx, ny) in blocked:
                continue
            visited.add((nx, ny))
            queue.append((nx, ny))

    total_cells = moteur.grille.largeur * moteur.grille.hauteur
    blocked_cells = len(blocked)
    free_cells = max(1, total_cells - blocked_cells)
    return min(1.0, len(visited) / free_cells)


def _build_analysis(moteur: MoteurJeu, safety_score: float) -> str:
    if moteur.game_over:
        return "Partie terminee apres une collision ou un blocage."
    if moteur.grille.nourriture is None:
        return "Aucune nourriture disponible, la grille est presque saturee."
    if safety_score >= 0.7:
        return "Zone de jeu ouverte et trajectoire stable."
    if safety_score >= 0.4:
        return "Trajectoire correcte mais la marge de manoeuvre se reduit."
    return "Espace libre faible, risque de piege eleve."


def _save_agent_game(agent_type: str, score: int, nb_steps: int, duration: float) -> None:
    db = SessionLocal()
    try:
        name = "A*" if agent_type == "astar" else "Q-Learning"
        agent = db.query(Agent).filter(Agent.type == agent_type).first()
        if agent is None:
            agent = Agent(name=name, type=agent_type)
            db.add(agent)
            db.commit()
            db.refresh(agent)

        db.add(
            Game(
                agent_id=agent.id,
                score=score,
                nb_steps=nb_steps,
                duration=duration,
            )
        )

        stats = db.query(AgentStats).filter(AgentStats.agent_id == agent.id).first()
        if stats is None:
            stats = AgentStats(
                agent_id=agent.id,
                games_played=0,
                avg_score=0.0,
                best_score=0,
                win_rate=0.0,
            )
            db.add(stats)

        old_games = stats.games_played or 0
        old_avg = stats.avg_score or 0.0
        old_best = stats.best_score or 0
        old_win_rate = stats.win_rate or 0.0
        wins = old_win_rate * old_games + (1 if score > 0 else 0)

        stats.games_played = old_games + 1
        stats.avg_score = (old_avg * old_games + score) / stats.games_played
        stats.best_score = max(old_best, score)
        stats.win_rate = wins / stats.games_played
        db.commit()
    finally:
        db.close()


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
    was_game_over = moteur.game_over
    started_at = perf_counter()

    if not moteur.game_over:
        direction = agent.choisir_action({"engine": moteur})
        moteur.changer_direction(direction)
        moteur.step()

    inference_ms = (perf_counter() - started_at) * 1000
    safety_score = _free_space_ratio(moteur)
    analysis = _build_analysis(moteur, safety_score)

    if not was_game_over and moteur.game_over:
        duration = round(moteur.step_count * 0.14, 3)
        _save_agent_game(request.agent_type, int(moteur.score), int(moteur.step_count), duration)

    return {
        "payload": moteur.get_state_dict(),
        "meta": {
            "inference_ms": round(inference_ms, 3),
            "epsilon": round(getattr(agent, "epsilon", 0.0), 4) if request.agent_type == "rl" else None,
            "safety_score": round(safety_score, 4),
            "analysis": analysis,
        },
    }
