"""Enumération des types de cellules de la grille de jeu."""

from enum import IntEnum


class TypeCellule(IntEnum):
    """Type d'une cellule dans la représentation NumPy de la grille.

    Les valeurs entières sont volontairement identiques aux entiers utilisés
    historiquement dans ``Grille.to_numpy_grid``, ce qui garantit la
    rétrocompatibilité sans modifier le comportement existant.
    """

    VIDE = 0
    SERPENT = 1
    NOURRITURE = 2
    OBSTACLE = 3
