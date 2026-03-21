"""Tests unitaires pour le module Serpent."""
import pytest
from game_engine.direction import Direction
from game_engine.serpent import Serpent


def test_deplacement_droite():
    """Le serpent avance bien vers la droite."""
    s = Serpent(5, 5, Direction.DROITE)
    s.se_deplacer()
    assert s.tete == (6, 5)


def test_deplacement_haut():
    """Le serpent avance bien vers le haut (y diminue)."""
    s = Serpent(5, 5, Direction.HAUT)
    s.se_deplacer()
    assert s.tete == (5, 4)


def test_pas_de_demi_tour():
    """Le serpent ne peut pas faire demi-tour directement."""
    s = Serpent(5, 5, Direction.DROITE)
    s.changer_direction(Direction.GAUCHE)
    assert s.direction == Direction.DROITE


def test_changement_direction_valide():
    """Le serpent change de direction si ce n'est pas un demi-tour."""
    s = Serpent(5, 5, Direction.DROITE)
    s.changer_direction(Direction.HAUT)
    assert s.direction == Direction.HAUT


def test_croissance():
    """Après grandir(), le serpent s'allonge au prochain déplacement."""
    s = Serpent(5, 5, Direction.DROITE)
    longueur_initiale = len(s.corps)
    s.grandir()
    s.se_deplacer()
    assert len(s.corps) == longueur_initiale + 1


def test_pas_de_croissance_sans_grandir():
    """Sans grandir(), la longueur reste constante après déplacement."""
    s = Serpent(5, 5, Direction.DROITE)
    longueur_initiale = len(s.corps)
    s.se_deplacer()
    assert len(s.corps) == longueur_initiale


def test_tete_est_premier_element():
    """La tête est toujours le premier élément du corps."""
    s = Serpent(3, 3, Direction.BAS)
    s.se_deplacer()
    assert s.tete == s.corps[0]
