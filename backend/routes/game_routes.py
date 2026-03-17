"""Routes REST pour contrôler une partie de Snake."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from database import SessionLocal
from game_engine.moteur import MoteurJeu
from models.agent import Agent
from models.game import Game
from models.stats import AgentStats

router = APIRouter(prefix="/api/game", tags=["game"])


# Moteur de jeu global simple pour les appels REST (le WebSocket aura son propre cycle)
_engine = MoteurJeu()


def get_engine() -> MoteurJeu:
    """Retourne une instance de moteur de jeu (singleton simple)."""
    return _engine


@router.post("/start")
def start_game(engine: MoteurJeu = Depends(get_engine)) -> dict:
    """Démarre une nouvelle partie."""
    engine.reset()
    return {"status": "started", "state": engine.get_state_dict()}


@router.post("/step")
def step_game(engine: MoteurJeu = Depends(get_engine)) -> dict:
    """Effectue un pas de jeu."""
    engine.step()
    # Si la partie vient de se terminer, on enregistre les stats en base
    if engine.game_over:
        _save_game_and_stats(engine)
    return {"state": engine.get_state_dict()}


@router.post("/reset")
def reset_game(engine: MoteurJeu = Depends(get_engine)) -> dict:
    """Réinitialise la partie."""
    engine.reset()
    return {"status": "reset", "state": engine.get_state_dict()}


@router.get("/state")
def get_state(engine: MoteurJeu = Depends(get_engine)) -> dict:
    """Retourne l'état courant de la partie."""
    return engine.get_state_dict()


def _save_game_and_stats(engine: MoteurJeu) -> None:
    """Enregistre une partie pilotée via les routes REST dans la base de données."""
    db = SessionLocal()
    try:
        # Pour les appels REST, on considère l'agent comme humain
        agent = db.query(Agent).filter(Agent.type == "human").first()
        if agent is None:
            agent = Agent(name="Humain", type="human")
            db.add(agent)
            db.commit()
            db.refresh(agent)

        score = int(engine.score)
        nb_steps = int(engine.step_count)
        duration = 0.0  # difficile à estimer ici, on laisse à 0 pour REST

        game = Game(
            agent_id=agent.id,
            score=score,
            nb_steps=nb_steps,
            duration=duration,
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
        stats.games_played = stats.games_played + 1
        stats.best_score = max(stats.best_score, score)
        stats.avg_score = (
            (stats.avg_score * old_games + score) / stats.games_played
            if stats.games_played > 0
            else 0.0
        )
        wins = stats.win_rate * old_games
        if score > 0:
            wins += 1
        stats.win_rate = wins / stats.games_played if stats.games_played > 0 else 0.0

        db.commit()
    finally:
        db.close()

