"""Routes REST pour obtenir les informations et statistiques des agents."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.agent import Agent
from models.stats import AgentStats

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("", response_model=List[dict])
def list_agents(db: Session = Depends(get_db)) -> List[dict]:
    """Retourne la liste des agents connus."""
    agents = db.query(Agent).all()
    if not agents:
        # Création lazy de 3 agents par défaut
        agents = [
            Agent(name="Humain", type="human"),
            Agent(name="A*", type="astar"),
            Agent(name="Q-Learning", type="rl"),
        ]
        db.add_all(agents)
        db.commit()
        for a in agents:
            db.refresh(a)
    return [
        {"id": a.id, "name": a.name, "type": a.type, "created_at": a.created_at.isoformat()}
        for a in agents
    ]


@router.get("/{agent_id}/stats")
def get_agent_stats(agent_id: int, db: Session = Depends(get_db)) -> dict:
    """Retourne les statistiques agrégées d'un agent."""
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent introuvable")
    stats = db.query(AgentStats).filter(AgentStats.agent_id == agent_id).first()
    if not stats:
        # Stats par défaut
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
    return {
        "agent_id": agent.id,
        "name": agent.name,
        "type": agent.type,
        "games_played": stats.games_played,
        "avg_score": stats.avg_score,
        "best_score": stats.best_score,
        "win_rate": stats.win_rate,
    }

