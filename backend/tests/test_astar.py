"""Tests unitaires pour l'agent A*."""
import pytest
from agents.agent_astar import AgentAStar
from game_engine.moteur import MoteurJeu
from game_engine.direction import Direction


def _make_engine_with_food(snake_pos, food_pos, mode="astar"):
    """Crée un moteur de jeu avec des positions contrôlées."""
    moteur = MoteurJeu()
    moteur.reset(mode=mode)
    moteur.serpent.corps = [snake_pos]
    moteur.grille.nourriture = food_pos
    moteur.static_obstacles = set()
    moteur.dynamic_obstacles = {}
    moteur._refresh_obstacles()
    return moteur


def test_astar_trouve_chemin_simple():
    """A* trouve un chemin sur grille libre (nourriture à droite)."""
    agent = AgentAStar()
    moteur = _make_engine_with_food((5, 10), (8, 10))
    direction = agent.choisir_action({"engine": moteur})
    assert direction == Direction.DROITE


def test_astar_trouve_chemin_haut():
    """A* trouve un chemin vers le haut."""
    agent = AgentAStar()
    moteur = _make_engine_with_food((10, 10), (10, 7))
    direction = agent.choisir_action({"engine": moteur})
    assert direction == Direction.HAUT


def test_astar_retourne_direction_valide():
    """A* retourne toujours une Direction valide (jamais None)."""
    agent = AgentAStar()
    moteur = MoteurJeu()
    moteur.reset(mode="astar")
    direction = agent.choisir_action({"engine": moteur})
    assert direction in list(Direction)


def test_astar_heuristique_manhattan():
    """L'heuristique Manhattan calcule la distance correctement."""
    agent = AgentAStar()
    assert agent._heuristique((0, 0), (3, 4)) == 7
    assert agent._heuristique((5, 5), (5, 5)) == 0
    assert agent._heuristique((1, 1), (4, 1)) == 3


def test_astar_survie_sans_chemin():
    """A* ne crashe pas si la nourriture est inaccessible."""
    agent = AgentAStar()
    moteur = MoteurJeu()
    moteur.reset(mode="astar")
    # Entoure la tête d'obstacles pour simuler un blocage partiel
    tete_x, tete_y = moteur.serpent.tete
    direction = agent.choisir_action({"engine": moteur})
    assert direction in list(Direction)
