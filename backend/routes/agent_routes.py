"""Routes REST pour interagir directement avec les agents IA."""

from __future__ import annotations

import time
from typing import Any, Optional

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


class SaveGameRequest(BaseModel):
    """Payload pour enregistrer une partie BattleArena en base de données."""

    agent_type: str          # "astar" | "rl"
    score: int
    nb_steps: int
    duration: float
    cause_mort: str = "inconnu"
    taille_grille: str = "20x20"
    obstacles_actifs: bool = True
    longueur_serpent: int = 1


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


# Singletons : évite de recharger la Q-table depuis le disque à chaque tick
_astar_singleton: Optional[AgentAStar] = None
_rl_singleton: Optional[AgentQL] = None


def _select_agent(agent_type: str) -> Any:
    global _astar_singleton, _rl_singleton
    if agent_type == "astar":
        if _astar_singleton is None:
            _astar_singleton = AgentAStar()
        return _astar_singleton
    if agent_type == "rl":
        if _rl_singleton is None:
            _rl_singleton = AgentQL(epsilon=EPSILON_MIN)
        return _rl_singleton
    raise HTTPException(status_code=400, detail=f"Agent type non supporte: {agent_type}")


def _compute_safety_score(moteur: MoteurJeu) -> float:
    """Proportion de cases adjacentes à la tête qui sont sûres (0.0 – 1.0)."""
    tete_x, tete_y = moteur.serpent.tete
    corps_set = set(list(moteur.serpent.corps)[1:])
    safe = sum(
        1
        for d in Direction
        if moteur.grille.est_dans_grille(tete_x + d.dx, tete_y + d.dy)
        and (tete_x + d.dx, tete_y + d.dy) not in moteur.grille.obstacles
        and (tete_x + d.dx, tete_y + d.dy) not in corps_set
    )
    return safe / 4.0


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
    """Fait avancer un agent d'un tick et retourne le nouvel etat + métriques."""

    moteur = _restore_engine(request.game_state)
    agent = _select_agent(request.agent_type)

    inference_ms = 0.0
    if not moteur.game_over:
        t0 = time.perf_counter()
        direction = agent.choisir_action({"engine": moteur})
        inference_ms = (time.perf_counter() - t0) * 1000.0
        moteur.changer_direction(direction)
        moteur.step()

    safety = _compute_safety_score(moteur)
    if safety >= 0.75:
        analysis = "Zone sûre"
    elif safety >= 0.5:
        analysis = "Zone serrée"
    else:
        analysis = "Danger élevé"

    epsilon = float(agent.epsilon) if hasattr(agent, "epsilon") else None

    return {
        "payload": moteur.get_state_dict(),
        "meta": {
            "inference_ms": round(inference_ms, 3),
            "safety_score": round(safety, 3),
            "epsilon": epsilon,
            "analysis": analysis,
        },
    }


def reset_rl_singleton() -> None:
    """Force le rechargement de la Q-table au prochain appel /api/agent/step.

    À appeler après un entraînement pour que la BattleArena utilise le modèle mis à jour.
    """
    global _rl_singleton
    _rl_singleton = None


@router.post("/save_game")
def save_agent_game(request: SaveGameRequest) -> dict:
    """Enregistre une partie BattleArena en base de données (stats + historique)."""
    from datetime import datetime

    from database import SessionLocal
    from models.agent import Agent as AgentModel
    from models.game import Game
    from models.stats import AgentStats

    name_map = {"astar": "A*", "rl": "Q-Learning"}
    name = name_map.get(request.agent_type, request.agent_type)

    db = SessionLocal()
    try:
        agent = db.query(AgentModel).filter(AgentModel.type == request.agent_type).first()
        if agent is None:
            agent = AgentModel(name=name, type=request.agent_type)
            db.add(agent)
            db.commit()
            db.refresh(agent)

        game = Game(
            agent_id=agent.id,
            score=request.score,
            nb_steps=request.nb_steps,
            duration=request.duration,
            longueur_serpent=request.longueur_serpent,
            cause_mort=request.cause_mort,
            taille_grille=request.taille_grille,
            obstacles_actifs=request.obstacles_actifs,
            date_fin=datetime.utcnow(),
        )
        db.add(game)

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

        if stats.games_played is None:
            stats.games_played = 0
        if stats.avg_score is None:
            stats.avg_score = 0.0
        if stats.best_score is None:
            stats.best_score = 0
        if stats.win_rate is None:
            stats.win_rate = 0.0

        old_games = stats.games_played
        stats.games_played += 1
        stats.best_score = max(stats.best_score, request.score)
        stats.avg_score = (stats.avg_score * old_games + request.score) / stats.games_played
        wins = stats.win_rate * old_games
        if request.score > 0:
            wins += 1
        stats.win_rate = wins / stats.games_played

        db.commit()
        return {"status": "saved"}
    finally:
        db.close()
