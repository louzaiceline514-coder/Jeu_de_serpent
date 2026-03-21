"""Moteur de jeu central pour le Snake (etat, step, reset)."""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from config import GRID_SIZE, OBSTACLE_SETTINGS
from game_engine.direction import Direction
from game_engine.grille import Grille
from game_engine.serpent import Serpent

Coord = Tuple[int, int]


@dataclass
class GameState:
    """Structure d'etat du jeu pour serialisation."""

    snake: List[Coord]
    food: Optional[Coord]
    obstacles: List[Coord]
    dynamic_obstacles: List[Tuple[int, int, int]]
    score: int
    game_over: bool
    mode: str
    step_count: int
    direction: str
    growth_pending: bool


class MoteurJeu:
    """Orchestre la grille, le serpent et la progression du jeu."""

    def __init__(self) -> None:
        self.grille = Grille(GRID_SIZE, GRID_SIZE)
        self.serpent = Serpent(GRID_SIZE // 2, GRID_SIZE // 2, Direction.DROITE)
        self.score: int = 0
        self.game_over: bool = False
        self.cause_mort: str = ""
        self.mode: str = "manual"
        self.step_count: int = 0
        self.start_time: float = time.time()
        self.static_obstacles: set[Coord] = set()
        self.dynamic_obstacles: Dict[Coord, int] = {}
        self.reset(mode=self.mode)

    def _mode_settings(self) -> Dict[str, int]:
        return OBSTACLE_SETTINGS.get(self.mode, OBSTACLE_SETTINGS["manual"])

    def _forbidden_cells(self) -> set[Coord]:
        forbidden = set(self.serpent.corps)
        if self.grille.nourriture:
            forbidden.add(self.grille.nourriture)
        return forbidden

    def _refresh_obstacles(self) -> None:
        self.grille.obstacles = set(self.static_obstacles) | set(self.dynamic_obstacles)

    def _spawn_dynamic_obstacle(self) -> None:
        settings = self._mode_settings()
        if settings["max_dynamic_obstacles"] <= 0:
            return
        if len(self.dynamic_obstacles) >= settings["max_dynamic_obstacles"]:
            return

        forbidden = self._forbidden_cells() | self.grille.obstacles
        libres = [
            (x, y)
            for x in range(self.grille.largeur)
            for y in range(self.grille.hauteur)
            if (x, y) not in forbidden
        ]
        if not libres:
            return

        coord = random.choice(libres)
        self.dynamic_obstacles[coord] = 0
        self._refresh_obstacles()

    def _update_dynamic_obstacles(self) -> None:
        settings = self._mode_settings()
        if settings["max_dynamic_obstacles"] <= 0:
            return

        lifetime = settings["dynamic_lifetime"]
        updated: Dict[Coord, int] = {}
        for coord, age in self.dynamic_obstacles.items():
            next_age = age + 1
            if next_age < lifetime and coord not in self.serpent.corps:
                updated[coord] = next_age
        self.dynamic_obstacles = updated
        self._refresh_obstacles()

        if self.step_count > 0 and self.step_count % settings["spawn_interval"] == 0:
            self._spawn_dynamic_obstacle()

    def _init_obstacles(self) -> None:
        settings = self._mode_settings()
        self.dynamic_obstacles = {}
        self.grille.generer_obstacles(
            nb_obstacles=settings["static_obstacles"],
            forbidden=set(self.serpent.corps),
        )
        self.static_obstacles = set(self.grille.obstacles)
        self._refresh_obstacles()

    def reset(self, mode: Optional[str] = None) -> None:
        """Reinitialise completement le jeu."""
        self.grille = Grille(GRID_SIZE, GRID_SIZE)
        self.serpent = Serpent(GRID_SIZE // 2, GRID_SIZE // 2, Direction.DROITE)
        self.score = 0
        self.game_over = False
        self.step_count = 0
        self.start_time = time.time()
        self.cause_mort = ""
        if mode is not None:
            self.mode = mode
        self._init_obstacles()
        self.grille.generer_nourriture(forbidden=self._forbidden_cells() | self.grille.obstacles)

    def changer_direction(self, direction: Direction) -> None:
        """Met a jour la direction du serpent."""
        self.serpent.changer_direction(direction)

    def step(self) -> None:
        """Effectue un pas de temps du jeu."""
        if self.game_over:
            return

        self.serpent.se_deplacer()
        self.step_count += 1

        x, y = self.serpent.tete

        # Collision avec les murs
        if x < 0 or x >= self.grille.largeur or y < 0 or y >= self.grille.hauteur:
            self.game_over = True
            self.cause_mort = "mur"
            return

        # Collision avec le corps
        if self.serpent.tete in self.serpent.corps[1:]:
            self.game_over = True
            self.cause_mort = "corps"
            return

        # Collision avec un obstacle
        if self.serpent.tete in self.grille.obstacles:
            self.game_over = True
            self.cause_mort = "obstacle"
            return

        if self.grille.nourriture and self.serpent.tete == self.grille.nourriture:
            self.score += 1
            self.serpent.grandir()
            self.grille.generer_nourriture(forbidden=self._forbidden_cells() | self.grille.obstacles)
            if self.grille.nourriture is None:
                self.game_over = True
                self.cause_mort = "victoire"
                return

        self._update_dynamic_obstacles()

    def get_state(self) -> GameState:
        """Retourne l'etat courant sous forme d'objet GameState."""
        return GameState(
            snake=list(self.serpent.corps),
            food=self.grille.nourriture,
            obstacles=sorted(self.grille.obstacles),
            dynamic_obstacles=sorted((x, y, age) for (x, y), age in self.dynamic_obstacles.items()),
            score=self.score,
            game_over=self.game_over,
            mode=self.mode,
            step_count=self.step_count,
            direction=self.serpent.direction.name,
            growth_pending=self.serpent.croissance_en_attente,
        )

    def get_state_dict(self) -> Dict:
        """Retourne l'etat courant sous forme de dictionnaire serialisable JSON."""
        state = self.get_state()
        return {
            "snake": [{"x": x, "y": y} for (x, y) in state.snake],
            "food": {"x": state.food[0], "y": state.food[1]} if state.food else None,
            "obstacles": [{"x": x, "y": y} for (x, y) in state.obstacles],
            "dynamic_obstacles": [
                {"x": x, "y": y, "age": age} for (x, y, age) in state.dynamic_obstacles
            ],
            "score": state.score,
            "game_over": state.game_over,
            "cause_mort": self.cause_mort,
            "longueur_serpent": len(self.serpent.corps),
            "taille_grille": f"{self.grille.largeur}x{self.grille.hauteur}",
            "obstacles_actifs": len(self.grille.obstacles) > 0,
            "mode": state.mode,
            "step_count": state.step_count,
            "direction": state.direction,
            "growth_pending": state.growth_pending,
        }
