"""Routes REST pour les statistiques globales et historiques des parties."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.agent import Agent
from models.game import Game
from models.stats import AgentStats

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/comparison")
def stats_comparison(db: Session = Depends(get_db)) -> dict:
    """Retourne une comparaison A* vs RL (scores moyens, meilleurs, parties jouées, taux de survie)."""
    agents = db.query(Agent).all()
    by_type = {a.type: a for a in agents}

    result = {}
    for key in ("astar", "rl"):
        agent = by_type.get(key)
        if not agent:
            result[key] = {
                "avg_score": 0.0,
                "best_score": 0,
                "games_played": 0,
                "win_rate": 0.0,
            }
            continue
        stats = db.query(AgentStats).filter(AgentStats.agent_id == agent.id).first()
        if not stats:
            stats = AgentStats(
                agent_id=agent.id,
                games_played=0,
                avg_score=0.0,
                best_score=0,
                win_rate=0.0,
            )
            db.add(stats)
            db.commit()
            db.refresh(stats)
        result[key] = {
            "avg_score": stats.avg_score,
            "best_score": stats.best_score,
            "games_played": stats.games_played,
            "win_rate": stats.win_rate,
        }
    return result


@router.get("/history")
def stats_history(db: Session = Depends(get_db)) -> List[dict]:
    """Retourne l'historique des dernières parties pour les deux agents IA."""
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
                "agent_type": agent.type,
                "score": game.score,
                "nb_steps": game.nb_steps,
                "duration": game.duration,
                "created_at": game.created_at.isoformat(),
            }
        )
    history.reverse()
    return history

