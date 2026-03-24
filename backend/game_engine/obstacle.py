"""Représentation d'un obstacle (statique ou dynamique) sur la grille."""

from __future__ import annotations

from typing import Tuple

Coord = Tuple[int, int]


class Obstacle:
    """Encapsule un obstacle avec sa position, son type et sa durée de vie.

    Correspond à la classe Obstacle du diagramme de classes du rapport de conception.
    """

    TYPE_STATIQUE = "statique"
    TYPE_DYNAMIQUE = "dynamique"

    def __init__(
        self,
        position: Coord,
        type_obstacle: str = TYPE_STATIQUE,
        age: int = 0,
    ) -> None:
        self.position: Coord = position
        self.type_obstacle: str = type_obstacle
        self.age: int = age

    def est_statique(self) -> bool:
        """Retourne True si l'obstacle est statique (permanent)."""
        return self.type_obstacle == self.TYPE_STATIQUE

    def est_actif(self, lifetime: int = 999) -> bool:
        """Retourne True si l'obstacle est encore vivant.

        Un obstacle statique est toujours actif.
        Un obstacle dynamique expire quand son âge dépasse lifetime.
        """
        if self.est_statique():
            return True
        return self.age < lifetime

    def vieillir(self) -> None:
        """Incrémente l'âge d'un obstacle dynamique d'un pas de temps."""
        if not self.est_statique():
            self.age += 1

    def __repr__(self) -> str:
        return (
            f"Obstacle(pos={self.position}, type={self.type_obstacle}, age={self.age})"
        )

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Obstacle):
            return self.position == other.position and self.type_obstacle == other.type_obstacle
        return NotImplemented

    def __hash__(self) -> int:
        return hash((self.position, self.type_obstacle))
