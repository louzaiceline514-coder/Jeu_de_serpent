"""Tests unitaires pour la classe Grille."""

from game_engine.grille import Grille


def test_est_dans_grille():
    g = Grille(20, 20)
    assert g.est_dans_grille(0, 0)
    assert g.est_dans_grille(19, 19)
    assert not g.est_dans_grille(-1, 0)
    assert not g.est_dans_grille(0, 20)


def test_generer_nourriture_sur_case_libre():
    g = Grille(5, 5)
    g.generer_nourriture(forbidden=set())
    assert g.nourriture is not None
    x, y = g.nourriture
    assert g.est_dans_grille(x, y)


def test_generer_nourriture_aucune_case_disponible():
    g = Grille(2, 2)
    forbidden = {(0, 0), (0, 1), (1, 0), (1, 1)}
    g.generer_nourriture(forbidden=forbidden)
    assert g.nourriture is None


def test_generer_obstacles_nombre_correct():
    g = Grille(5, 5)
    g.generer_obstacles(nb_obstacles=5, forbidden=set())
    assert len(g.obstacles) == 5


def test_obtenir_voisins_bornes():
    g = Grille(3, 3)
    voisins_centre = g.obtenir_voisins(1, 1)
    assert len(voisins_centre) == 4
    voisins_coin = g.obtenir_voisins(0, 0)
    assert len(voisins_coin) == 2

