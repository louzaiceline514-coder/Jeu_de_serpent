"""Tests unitaires pour la classe Serpent."""

from game_engine.direction import Direction
from game_engine.serpent import Serpent


def test_deplacement_simple():
    serpent = Serpent(5, 5, Direction.DROITE)
    serpent.se_deplacer()
    assert serpent.tete == (6, 5)


def test_grandir_augment_longueur():
    serpent = Serpent(5, 5, Direction.DROITE)
    serpent.grandir()
    serpent.se_deplacer()
    assert len(serpent.corps) == 2


def test_changement_direction_valide():
    serpent = Serpent(5, 5, Direction.DROITE)
    serpent.changer_direction(Direction.HAUT)
    serpent.se_deplacer()
    assert serpent.tete == (5, 4)


def test_demi_tour_interdit():
    serpent = Serpent(5, 5, Direction.DROITE)
    serpent.changer_direction(Direction.GAUCHE)
    serpent.se_deplacer()
    # La direction ne doit pas avoir changé
    assert serpent.tete == (6, 5)


def test_collision_mur_gauche():
    serpent = Serpent(0, 5, Direction.GAUCHE)
    serpent.se_deplacer()
    assert serpent.verifier_collision(20, 20) is True


def test_collision_mur_haut():
    serpent = Serpent(5, 0, Direction.HAUT)
    serpent.se_deplacer()
    assert serpent.verifier_collision(20, 20) is True


def test_collision_corps():
    serpent = Serpent(5, 5, Direction.DROITE)
    serpent.corps = [(5, 5), (4, 5), (3, 5)]
    # Collision volontaire : on force la direction directement (sans passer par la règle "demi-tour interdit")
    serpent.direction = Direction.GAUCHE
    serpent.se_deplacer()
    assert serpent.verifier_collision(20, 20) is True


def test_aucune_collision_initiale():
    serpent = Serpent(5, 5, Direction.DROITE)
    assert serpent.verifier_collision(20, 20) is False

