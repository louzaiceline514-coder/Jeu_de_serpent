"""Tests unitaires pour l'agent A*."""

from agents.agent_astar import AgentAStar
from game_engine.direction import Direction
from game_engine.moteur import MoteurJeu


def _prepare_engine_with_food():
    engine = MoteurJeu()
    engine.grille.obstacles.clear()
    engine.serpent.corps = [(5, 5)]
    engine.grille.nourriture = (10, 5)
    return engine


def test_chemin_simple_droite():
    engine = _prepare_engine_with_food()
    agent = AgentAStar()
    direction = agent.choisir_action({"engine": engine})
    assert direction == Direction.DROITE


def test_obstacle_sur_le_chemin():
    engine = _prepare_engine_with_food()
    engine.grille.obstacles.add((6, 5))
    agent = AgentAStar()
    direction = agent.choisir_action({"engine": engine})
    assert direction in (Direction.HAUT, Direction.BAS)


def test_aucun_chemin_possible_fallback():
    engine = _prepare_engine_with_food()
    # Entoure la tête de murs (obstacles)
    engine.grille.obstacles.update({(6, 5), (5, 4), (5, 6)})
    agent = AgentAStar()
    direction = agent.choisir_action({"engine": engine})
    assert isinstance(direction, Direction)


def test_direction_depuis_deplacement():
    agent = AgentAStar()
    d = agent._direction_depuis_deplacement((0, 0), (1, 0))
    assert d == Direction.DROITE

