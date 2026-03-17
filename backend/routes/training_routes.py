"""Routes REST pour piloter l'entraînement de l'agent RL."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from agents.agent_astar import AgentAStar
from config import BASE_DIR
from database import SessionLocal
from game_engine.moteur import MoteurJeu
from models.agent import Agent
from models.game import Game
from models.stats import AgentStats
from training.trainer import Trainer

router = APIRouter(prefix="/api/training", tags=["training"])


class TrainingRequest(BaseModel):
    """Payload JSON pour lancer un entraînement ou un benchmark."""

    episodes: int = 1000
    agent_type: str = "rl"  # "rl" ou "astar"


_trainer: Optional[Trainer] = None


def get_trainer() -> Trainer:
    """Retourne un trainer singleton pour l'agent RL."""
    global _trainer
    if _trainer is None:
        csv_path = BASE_DIR / "training_results.csv"
        _trainer = Trainer(csv_path)
    return _trainer


@router.post("/start")
def start_training(payload: TrainingRequest) -> dict:
    """Lance un entraînement RL ou un benchmark A* en fonction du type d'agent."""
    episodes = min(payload.episodes, 100)  # Limite à 100 épisodes max pour éviter timeout

    if payload.agent_type == "rl":
        trainer = get_trainer()
        trainer.entrainer(episodes, callback_progression=None)
        return {
            "status": "finished",
            "agent_type": "rl",
            "episodes": episodes,
            "scores": trainer.scores,
        }

    # Benchmark A* : N parties jouées automatiquement
    db = SessionLocal()
    try:
        agent = db.query(Agent).filter(Agent.type == "astar").first()
        if agent is None:
            agent = Agent(name="A*", type="astar")
            db.add(agent)
            db.commit()
            db.refresh(agent)

        moteur = MoteurJeu()
        agent_astar = AgentAStar()
        scores: list[int] = []

        for i in range(episodes):
            moteur.reset(mode="astar")
            from time import time as now

            start_time = now()
            steps = 0
            max_steps = 500  # Limite de steps pour éviter boucles infinies
            
            while not moteur.game_over and steps < max_steps:
                direction = agent_astar.choisir_action({"engine": moteur})
                moteur.changer_direction(direction)
                moteur.step()
                steps += 1
                
            duration = float(now() - start_time)
            score = int(moteur.score)
            nb_steps = moteur.step_count
            scores.append(score)

            game = Game(
                agent_id=agent.id,
                score=score,
                nb_steps=nb_steps,
                duration=duration,
            )
            db.add(game)

            # Mise à jour des stats à la fin seulement
            if i == episodes - 1:
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

                # Récupérer toutes les parties pour mettre à jour les stats
                all_games = db.query(Game).filter(Game.agent_id == agent.id).all()
                total_games = len(all_games)
                if total_games > 0:
                    all_scores = [g.score for g in all_games]
                    stats.games_played = total_games
                    stats.avg_score = sum(all_scores) / total_games
                    stats.best_score = max(all_scores)
                    stats.win_rate = sum(1 for s in all_scores if s > 0) / total_games

            db.commit()
    finally:
        db.close()

    return {
        "status": "finished",
        "agent_type": "astar",
        "episodes": episodes,
        "scores": scores,
    }


@router.get("/status")
def training_status() -> dict:
    """Retourne l'état de l'entraînement (simple booléen)."""
    trainer = get_trainer()
    return {"in_progress": trainer.en_cours}


@router.get("/results")
def training_results() -> dict:
    """Retourne les derniers scores d'entraînement."""
    trainer = get_trainer()
    return {"scores": trainer.scores}

