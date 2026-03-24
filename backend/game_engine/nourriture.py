"""Représentation de la nourriture sur la grille (diagramme de classes)."""

from __future__ import annotations

from typing import Optional, Tuple

Coord = Tuple[int, int]


class Nourriture:
    """Encapsule la position et l'état de la nourriture dans le jeu.

    Correspond à la classe Nourriture du diagramme de classes du rapport de conception.
    """

    def __init__(self, position: Optional[Coord] = None) -> None:
        self.position: Optional[Coord] = position

    def est_presente(self) -> bool:
        """Retourne True si la nourriture est posée sur la grille."""
        return self.position is not None

    def placer(self, position: Coord) -> None:
        """Place la nourriture à la coordonnée donnée."""
        self.position = position

    def effacer(self) -> None:
        """Retire la nourriture de la grille."""
        self.position = None

    def __repr__(self) -> str:
        return f"Nourriture(position={self.position})"

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Nourriture):
            return self.position == other.position
        return NotImplemented
