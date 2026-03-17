"""Moteur de jeu central pour le Snake (état, step, reset)."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from config import GRID_SIZE
from game_engine.direction import Direction
from game_engine.grille import Grille
from game_engine.serpent import Serpent

Coord = Tuple[int, int]


@dataclass
class GameState:
    """Structure d'état du jeu pour sérialisation."""

    snake: List[Coord]
    food: Optional[Coord]
    obstacles: List[Coord]
    score: int
    game_over: bool
    mode: str
    step_count: int


class MoteurJeu:
    """Orchestre la grille, le serpent et la progression du jeu."""

    def __init__(self) -> None:
        self.grille = Grille(GRID_SIZE, GRID_SIZE)
        self.serpent = Serpent(GRID_SIZE // 2, GRID_SIZE // 2, Direction.DROITE)
        self.score: int = 0
        self.game_over: bool = False
        self.mode: str = "manual"  # manual | astar | rl | training
        self.step_count: int = 0
        self.start_time: float = time.time()
        # Obstacles : on en met en mode manuel/A* ; on les désactive en RL par défaut
        # (un agent RL non entraîné meurt sinon très vite, ce qui donne l'impression qu'il "ne marche pas").
        nb_obstacles = 0 if self.mode in ("rl", "training") else 20
        self.grille.generer_obstacles(nb_obstacles=nb_obstacles, forbidden=set(self.serpent.corps))
        self.grille.generer_nourriture(forbidden=set(self.serpent.corps) | self.grille.obstacles)

    def reset(self, mode: Optional[str] = None) -> None:
        """Réinitialise complètement le jeu."""
        self.grille = Grille(GRID_SIZE, GRID_SIZE)
        self.serpent = Serpent(GRID_SIZE // 2, GRID_SIZE // 2, Direction.DROITE)
        self.score = 0
        self.game_over = False
        self.step_count = 0
        self.start_time = time.time()
        if mode is not None:
            self.mode = mode
        nb_obstacles = 0 if self.mode in ("rl", "training") else 20
        self.grille.generer_obstacles(nb_obstacles=nb_obstacles, forbidden=set(self.serpent.corps))
        self.grille.generer_nourriture(forbidden=set(self.serpent.corps) | self.grille.obstacles)

    def changer_direction(self, direction: Direction) -> None:
        """Met à jour la direction du serpent (utilisé en mode manuel ou IA)."""
        self.serpent.changer_direction(direction)

    def step(self) -> None:
        """Effectue un pas de temps du jeu."""
        if self.game_over:
            return

        self.serpent.se_deplacer()
        self.step_count += 1

        # Collision murs ou corps
        if self.serpent.verifier_collision(self.grille.largeur, self.grille.hauteur):
            self.game_over = True
            return

        # Collision obstacles
        if self.serpent.tete in self.grille.obstacles:
            self.game_over = True
            return

        # Gestion nourriture
        if self.grille.nourriture and self.serpent.tete == self.grille.nourriture:
            self.score += 1
            self.serpent.grandir()
            self.grille.generer_nourriture(forbidden=set(self.serpent.corps) | self.grille.obstacles)

    def get_state(self) -> GameState:
        """Retourne l'état courant sous forme d'objet GameState."""
        return GameState(
            snake=list(self.serpent.corps),
            food=self.grille.nourriture,
            obstacles=list(self.grille.obstacles),
            score=self.score,
            game_over=self.game_over,
            mode=self.mode,
            step_count=self.step_count,
        )

    def get_state_dict(self) -> Dict:
        """Retourne l'état courant sous forme de dictionnaire sérialisable JSON."""
        state = self.get_state()
        return {
            "snake": [{"x": x, "y": y} for (x, y) in state.snake],
            "food": {"x": state.food[0], "y": state.food[1]} if state.food else None,
            "obstacles": [{"x": x, "y": y} for (x, y) in state.obstacles],
            "score": state.score,
            "game_over": state.game_over,
            "mode": state.mode,
            "step_count": state.step_count,
        }

