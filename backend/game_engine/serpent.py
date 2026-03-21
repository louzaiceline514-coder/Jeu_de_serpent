"""Logique du serpent (déplacement, croissance, collisions)."""

from __future__ import annotations

from typing import List, Tuple

from .direction import Direction

Coord = Tuple[int, int]


class Serpent:
    """Représente le serpent sur la grille."""

    def __init__(self, x: int, y: int, direction: Direction) -> None:
        # Le corps est une liste de coordonnées (tête en premier)
        self.corps: List[Coord] = [(x, y)]
        self.direction: Direction = direction
        self._doit_grandir: bool = False

    @property
    def tete(self) -> Coord:
        """Retourne la position de la tête."""
        return self.corps[0]

    @property
    def croissance_en_attente(self) -> bool:
        """Indique si le serpent doit grandir au prochain déplacement."""
        return self._doit_grandir

    @croissance_en_attente.setter
    def croissance_en_attente(self, value: bool) -> None:
        self._doit_grandir = bool(value)

    def changer_direction(self, nouvelle_direction: Direction) -> None:
        """Change la direction si ce n'est pas un demi-tour."""
        if nouvelle_direction == Direction.opposite(self.direction):
            return
        self.direction = nouvelle_direction

    def se_deplacer(self) -> None:
        """Déplace le serpent dans la direction courante."""
        x, y = self.tete
        nx, ny = x + self.direction.dx, y + self.direction.dy
        nouvelle_tete = (nx, ny)
        self.corps.insert(0, nouvelle_tete)
        if not self._doit_grandir:
            self.corps.pop()
        else:
            self._doit_grandir = False

    def grandir(self) -> None:
        """Indique que le serpent doit grandir au prochain déplacement."""
        self._doit_grandir = True

