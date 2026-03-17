"""Gestion de la grille de jeu (nourriture, obstacles, voisins)."""

from __future__ import annotations

import random
from typing import List, Optional, Set, Tuple

from .direction import Direction

Coord = Tuple[int, int]


class Grille:
    """Représente la grille de jeu du Snake."""

    def __init__(self, largeur: int, hauteur: int) -> None:
        self.largeur = largeur
        self.hauteur = hauteur
        # Ensemble de coordonnées pour les obstacles
        self.obstacles: Set[Coord] = set()
        # Position actuelle de la nourriture
        self.nourriture: Optional[Coord] = None

    def est_dans_grille(self, x: int, y: int) -> bool:
        """Vérifie si une coordonnée est dans les bornes de la grille."""
        return 0 <= x < self.largeur and 0 <= y < self.hauteur

    def generer_obstacles(self, nb_obstacles: int = 0, forbidden: Optional[Set[Coord]] = None) -> None:
        """Génère aléatoirement des obstacles sur la grille.

        :param nb_obstacles: nombre d'obstacles à placer
        :param forbidden: cases interdites (par ex. corps du serpent)
        """
        self.obstacles.clear()
        if nb_obstacles <= 0:
            return
        if forbidden is None:
            forbidden = set()

        libres = [
            (x, y)
            for x in range(self.largeur)
            for y in range(self.hauteur)
            if (x, y) not in forbidden
        ]
        random.shuffle(libres)
        for coord in libres[:nb_obstacles]:
            self.obstacles.add(coord)

    def generer_nourriture(self, forbidden: Optional[Set[Coord]] = None) -> None:
        """Place la nourriture sur une case libre (non interdite)."""
        if forbidden is None:
            forbidden = set()

        libres = [
            (x, y)
            for x in range(self.largeur)
            for y in range(self.hauteur)
            if (x, y) not in forbidden and (x, y) not in self.obstacles
        ]
        if not libres:
            self.nourriture = None
            return
        self.nourriture = random.choice(libres)

    def obtenir_voisins(self, x: int, y: int) -> List[Coord]:
        """Retourne les cases voisines (4-connectivité) dans la grille."""
        voisins: List[Coord] = []
        for direction in Direction:
            nx, ny = x + direction.dx, y + direction.dy
            if self.est_dans_grille(nx, ny):
                voisins.append((nx, ny))
        return voisins

