"""Routes REST pour piloter l'entraînement de l'agent RL."""

from __future__ import annotations

import asyncio
from functools import partial
from pathlib import Path
from typing import Optional
from statistics import mean

from fastapi import APIRouter
from pydantic import BaseModel

from agents.agent_astar import AgentAStar
from config import BASE_DIR
from game_engine.moteur import MoteurJeu
from training.trainer import Trainer

router = APIRouter(prefix="/api/training", tags=["training"])


class TrainingRequest(BaseModel):
    """Payload JSON pour lancer un entraînement ou un benchmark."""

    episodes: int = 1000
    agent_type: str = "rl"  # "rl" ou "astar"


_trainer: Optional[Trainer] = None
_astar_benchmark_scores: list[int] = []


def get_trainer() -> Trainer:
    """Retourne un trainer singleton pour l'agent RL."""
    global _trainer
    if _trainer is None:
        csv_path = BASE_DIR / "training_results.csv"
        _trainer = Trainer(csv_path)
    return _trainer


def _build_summary(scores: list[int]) -> dict:
    if not scores:
        return {
            "episodes": 0,
            "avg_score": 0.0,
            "best_score": 0,
            "survival_rate": 0.0,
        }

    return {
        "episodes": len(scores),
        "avg_score": mean(scores),
        "best_score": max(scores),
        "survival_rate": sum(1 for score in scores if score > 0) / len(scores),
    }


@router.post("/start")
async def start_training(payload: TrainingRequest) -> dict:
    """Lance un entraînement RL ou un benchmark A* en fonction du type d'agent."""
    global _astar_benchmark_scores
    episodes = min(payload.episodes, 100)  # Limite à 100 épisodes max pour éviter timeout
    loop = asyncio.get_event_loop()

    if payload.agent_type == "rl":
        trainer = get_trainer()
        await loop.run_in_executor(None, partial(trainer.entrainer, episodes, None))
        # Invalide le singleton RL de la BattleArena pour qu'il recharge la Q-table à jour
        from routes.agent_routes import reset_rl_singleton
        reset_rl_singleton()
        return {
            "status": "finished",
            "agent_type": "rl",
            "episodes": episodes,
            "scores": trainer.scores,
            "summary": _build_summary(trainer.scores),
        }

    # Benchmark A* : N parties jouées automatiquement
    def _run_astar_benchmark() -> list[int]:
        moteur = MoteurJeu()
        agent_astar = AgentAStar()
        scores: list[int] = []
        for _ in range(episodes):
            moteur.reset(mode="astar")
            steps = 0
            max_steps = 500
            while not moteur.game_over and steps < max_steps:
                direction = agent_astar.choisir_action({"engine": moteur})
                moteur.changer_direction(direction)
                moteur.step()
                steps += 1
            scores.append(int(moteur.score))
        return scores

    scores = await loop.run_in_executor(None, _run_astar_benchmark)
    _astar_benchmark_scores = list(scores)

    return {
        "status": "finished",
        "agent_type": "astar",
        "episodes": episodes,
        "scores": scores,
        "summary": _build_summary(scores),
    }


@router.get("/status")
def training_status() -> dict:
    """Retourne l'état de l'entraînement (simple booléen)."""
    trainer = get_trainer()
    return {"in_progress": trainer.en_cours}


@router.get("/results")
def training_results() -> dict:
    """Retourne les derniers scores d'entraînement RL et de benchmark A*."""
    trainer = get_trainer()
    return {
        "rl_scores": trainer.scores,
        "astar_scores": _astar_benchmark_scores,
        "rl_summary": _build_summary(trainer.scores),
        "astar_summary": _build_summary(_astar_benchmark_scores),
    }
