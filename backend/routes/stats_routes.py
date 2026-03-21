"""Routes REST pour les statistiques globales et historiques des parties."""

from __future__ import annotations

from statistics import mean
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.agent import Agent
from models.game import Game

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _agent_key(agent_type: str | None) -> str:
    return "manual" if agent_type == "human" else (agent_type or "unknown")


def _empty_stats() -> dict:
    return {
        "avg_score": 0.0,
        "best_score": 0,
        "games_played": 0,
        "win_rate": 0.0,
        "avg_steps": 0.0,
        "avg_duration": 0.0,
        "last_score": 0,
        "recent_avg_score": 0.0,
    }


def _compute_stats(db: Session, agent: Agent | None) -> dict:
    if agent is None:
        return _empty_stats()

    games = db.query(Game).filter(Game.agent_id == agent.id).order_by(Game.created_at.asc()).all()
    if not games:
        return _empty_stats()

    scores = [game.score for game in games]
    steps = [game.nb_steps for game in games]
    durations = [game.duration for game in games]
    recent_scores = scores[-10:]
    games_played = len(scores)
    wins = sum(1 for score in scores if score > 0)
    return {
        "avg_score": sum(scores) / games_played,
        "best_score": max(scores),
        "games_played": games_played,
        "win_rate": wins / games_played,
        "avg_steps": sum(steps) / games_played,
        "avg_duration": sum(durations) / games_played,
        "last_score": scores[-1],
        "recent_avg_score": mean(recent_scores),
    }


@router.get("/comparison")
def stats_comparison(db: Session = Depends(get_db)) -> dict:
    """Retourne une comparaison des modes basee sur les parties reellement enregistrees."""
    agents = db.query(Agent).all()
    by_type = {agent.type: agent for agent in agents}
    return {
        "manual": _compute_stats(db, by_type.get("human")),
        "astar": _compute_stats(db, by_type.get("astar")),
        "rl": _compute_stats(db, by_type.get("rl")),
    }


@router.get("/history")
def stats_history(db: Session = Depends(get_db)) -> List[dict]:
    """Retourne l'historique des dernieres parties pour tous les modes."""
    games = (
        db.query(Game, Agent)
        .join(Agent, Game.agent_id == Agent.id)
        .order_by(Game.created_at.desc())
        .limit(200)
        .all()
    )

    history: List[dict] = []
    for game, agent in games:
        history.append(
            {
                "agent_type": _agent_key(agent.type),
                "agent_name": agent.name,
                "score": game.score,
                "nb_steps": game.nb_steps,
                "duration": game.duration,
                "created_at": game.created_at.isoformat(),
            }
        )
    history.reverse()
    return history
