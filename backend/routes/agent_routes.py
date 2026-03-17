"""Routes REST pour interagir directement avec les agents IA."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from agents.agent_astar import AgentAStar
from agents.agent_rl import AgentQL
from game_engine.moteur import MoteurJeu

router = APIRouter(prefix="/api/agent", tags=["agent"])


class GameState(BaseModel):
    """État du jeu pour l'API."""
    snake: list[dict]
    food: dict | None
    obstacles: list[dict]
    score: int
    gameOver: bool
    stepCount: int


class AgentStepRequest(BaseModel):
    """Requête pour un step d'agent."""
    agent_type: str  # "astar" ou "rl"
    game_state: GameState


@router.post("/step")
def agent_step(request: AgentStepRequest) -> dict:
    """Fait un step avec l'agent spécifié et retourne le nouvel état."""
    
    # Recréer l'état du moteur
    moteur = MoteurJeu()
    moteur.score = request.game_state.score
    moteur.game_over = request.game_state.gameOver
    moteur.step_count = request.game_state.stepCount
    
    # Restaurer le serpent
    if request.game_state.snake:
        from game_engine.direction import Direction
        head = request.game_state.snake[0]
        moteur.serpent.tete = (head["x"], head["y"])
        moteur.serpent.corps = [(s["x"], s["y"]) for s in request.game_state.snake]
        
        # Déterminer la direction actuelle
        if len(request.game_state.snake) > 1:
            second = request.game_state.snake[1]
            dx = second["x"] - head["x"]
            dy = second["y"] - head["y"]
            for direction in Direction:
                if direction.dx == -dx and direction.dy == -dy:
                    moteur.serpent.direction = direction
                    break
    
    # Restaurer la nourriture et obstacles
    if request.game_state.food:
        moteur.grille.nourriture = (request.game_state.food["x"], request.game_state.food["y"])
    
    moteur.grille.obstacles = {(o["x"], o["y"]) for o in request.game_state.obstacles}
    
    # Choisir l'agent
    if request.agent_type == "astar":
        agent = AgentAStar()
    elif request.agent_type == "rl":
        agent = AgentQL()
    else:
        raise ValueError(f"Agent type {request.agent_type} not supported")
    
    # Faire le step
    if not moteur.game_over:
        direction = agent.choisir_action({"engine": moteur})
        moteur.changer_direction(direction)
        moteur.step()
    
    # Retourner le nouvel état
    return {
        "payload": {
            "snake": [{"x": x, "y": y} for (x, y) in moteur.serpent.corps],
            "food": {"x": moteur.grille.nourriture[0], "y": moteur.grille.nourriture[1]} if moteur.grille.nourriture else None,
            "obstacles": [{"x": x, "y": y} for (x, y) in moteur.grille.obstacles],
            "score": moteur.score,
            "gameOver": moteur.game_over,
            "stepCount": moteur.step_count
        }
    }
