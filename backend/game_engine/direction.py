"""Enumération des directions du serpent."""

from enum import Enum


class Direction(Enum):
    """Directions possibles pour le serpent."""

    HAUT = (0, -1)
    BAS = (0, 1)
    GAUCHE = (-1, 0)
    DROITE = (1, 0)

    @property
    def dx(self) -> int:
        """Composante horizontale du déplacement."""
        return self.value[0]

    @property
    def dy(self) -> int:
        """Composante verticale du déplacement."""
        return self.value[1]

    @staticmethod
    def opposite(direction: "Direction") -> "Direction":
        """Retourne la direction opposée (pour éviter les demi-tours)."""
        opposites = {
            Direction.HAUT: Direction.BAS,
            Direction.BAS: Direction.HAUT,
            Direction.GAUCHE: Direction.DROITE,
            Direction.DROITE: Direction.GAUCHE,
        }
        return opposites[direction]

