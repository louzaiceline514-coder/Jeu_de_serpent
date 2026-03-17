"""Agent IA utilisant l'algorithme A* pour rejoindre la nourriture."""

from __future__ import annotations

import heapq
from typing import Any, Dict, List, Optional, Set, Tuple

from game_engine.direction import Direction
from game_engine.grille import Grille
from game_engine.moteur import MoteurJeu
from agents.base_agent import Agent

Coord = Tuple[int, int]


class AgentAStar(Agent):
    """Agent basé sur A* qui cherche un chemin sûr jusqu'à la nourriture."""

    def __init__(self) -> None:
        super().__init__(name="A*")

    def _heuristique(self, a: Coord, b: Coord) -> int:
        """Distance de Manhattan entre deux cases."""
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    def _reconstruire_chemin(self, came_from: Dict[Coord, Coord], current: Coord) -> List[Coord]:
        """Reconstruit le chemin depuis la nourriture jusqu'à la tête."""
        chemin = [current]
        while current in came_from:
            current = came_from[current]
            chemin.append(current)
        chemin.reverse()
        return chemin

    def _astar(
        self,
        grille: Grille,
        depart: Coord,
        objectif: Coord,
        forbidden: Set[Coord],
    ) -> Optional[List[Coord]]:
        """Algorithme A* classique sur la grille."""
        open_set: List[Tuple[int, Coord]] = []
        heapq.heappush(open_set, (0, depart))
        came_from: Dict[Coord, Coord] = {}
        g_score: Dict[Coord, int] = {depart: 0}
        f_score: Dict[Coord, int] = {depart: self._heuristique(depart, objectif)}

        visited: Set[Coord] = set()

        while open_set:
            _, current = heapq.heappop(open_set)
            if current == objectif:
                return self._reconstruire_chemin(came_from, current)
            if current in visited:
                continue
            visited.add(current)

            for voisin in grille.obtenir_voisins(*current):
                if voisin in forbidden:
                    continue
                tentative_g = g_score[current] + 1
                if tentative_g < g_score.get(voisin, 1_000_000_000):
                    came_from[voisin] = current
                    g_score[voisin] = tentative_g
                    f_score[voisin] = tentative_g + self._heuristique(voisin, objectif)
                    heapq.heappush(open_set, (f_score[voisin], voisin))
        return None

    def _direction_depuis_deplacement(self, src: Coord, dst: Coord) -> Direction:
        """Convertit deux coordonnées adjacentes en une direction."""
        dx = dst[0] - src[0]
        dy = dst[1] - src[1]
        for d in Direction:
            if (d.dx, d.dy) == (dx, dy):
                return d
        return Direction.DROITE

    def _espace_libre(self, grille: Grille, tete: Coord, forbidden: Set[Coord]) -> int:
        """Estime grossièrement l'espace libre accessible (flood fill simplifié)."""
        stack = [tete]
        vus: Set[Coord] = set()
        while stack and len(vus) < 100:  # limite pour rester léger
            x, y = stack.pop()
            if (x, y) in vus or (x, y) in forbidden:
                continue
            vus.add((x, y))
            for voisin in grille.obtenir_voisins(x, y):
                if voisin not in vus and voisin not in forbidden:
                    stack.append(voisin)
        return len(vus)

    def choisir_action(self, state: Dict[str, Any]) -> Direction:
        """Choisit une direction vers la nourriture ou, à défaut, maximise l'espace libre."""
        moteur: MoteurJeu = state["engine"]
        grille = moteur.grille
        tete = moteur.serpent.tete
        corps = list(moteur.serpent.corps)[1:]
        forbidden: Set[Coord] = set(corps) | grille.obstacles

        if not grille.nourriture:
            return moteur.serpent.direction

        chemin = self._astar(grille, tete, grille.nourriture, forbidden)
        if chemin and len(chemin) >= 2:
            return self._direction_depuis_deplacement(chemin[0], chemin[1])

        # Fallback : choisir la direction qui maximise l'espace libre
        meilleures_directions: List[Tuple[int, Direction]] = []
        for direction in Direction:
            nx, ny = tete[0] + direction.dx, tete[1] + direction.dy
            if not grille.est_dans_grille(nx, ny):
                continue
            if (nx, ny) in forbidden:
                continue
            espace = self._espace_libre(grille, (nx, ny), forbidden)
            meilleures_directions.append((espace, direction))

        if not meilleures_directions:
            return moteur.serpent.direction

        meilleures_directions.sort(key=lambda x: x[0], reverse=True)
        return meilleures_directions[0][1]

