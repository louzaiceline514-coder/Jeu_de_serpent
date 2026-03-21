"""Tests unitaires pour le moteur de jeu."""
import pytest
from game_engine.moteur import MoteurJeu
from game_engine.direction import Direction


def test_reset_initialise_etat():
    """Après reset, le jeu est dans un état initial cohérent."""
    moteur = MoteurJeu()
    moteur.reset(mode="manual")
    assert not moteur.game_over
    assert moteur.score == 0
    assert moteur.step_count == 0
    assert len(moteur.serpent.corps) >= 1
    assert moteur.grille.nourriture is not None


def test_step_incremente_compteur():
    """Chaque step incrémente le compteur de pas."""
    moteur = MoteurJeu()
    moteur.reset(mode="manual")
    moteur.step()
    assert moteur.step_count == 1
    moteur.step()
    assert moteur.step_count == 2


def test_collision_mur_game_over():
    """Le serpent mourant en frappant un mur déclenche game_over."""
    moteur = MoteurJeu()
    moteur.reset(mode="manual")
    # Place le serpent près du bord gauche et le dirige vers la gauche
    moteur.serpent.corps = [(0, 10)]
    moteur.serpent.direction = Direction.GAUCHE
    moteur.static_obstacles = set()
    moteur.dynamic_obstacles = {}
    moteur._refresh_obstacles()
    moteur.step()
    assert moteur.game_over


def test_nourriture_augmente_score():
    """Manger la nourriture augmente le score."""
    moteur = MoteurJeu()
    moteur.reset(mode="manual")
    tete_x, tete_y = moteur.serpent.tete
    # Place la nourriture juste devant la tête
    direction = moteur.serpent.direction
    moteur.grille.nourriture = (tete_x + direction.dx, tete_y + direction.dy)
    score_avant = moteur.score
    moteur.step()
    assert moteur.score > score_avant


def test_collision_corps_game_over():
    """Le serpent se mordant déclenche game_over."""
    moteur = MoteurJeu()
    moteur.reset(mode="manual")
    # Corps en spirale : tête (5,5) va HAUT → (5,4) qui est en position 3 du corps (pas la queue)
    # La queue (5,6) sera retirée, mais (5,4) reste → collision soi-même
    moteur.serpent.corps = [(5, 5), (4, 5), (4, 4), (5, 4), (6, 4), (6, 5), (6, 6), (5, 6)]
    moteur.serpent.direction = Direction.HAUT
    moteur.static_obstacles = set()
    moteur.dynamic_obstacles = {}
    moteur._refresh_obstacles()
    moteur.step()
    assert moteur.game_over


def test_get_state_dict_structure():
    """get_state_dict retourne toutes les clés attendues."""
    moteur = MoteurJeu()
    moteur.reset(mode="manual")
    state = moteur.get_state_dict()
    for key in ("snake", "food", "obstacles", "score", "game_over", "step_count", "mode"):
        assert key in state, f"Clé manquante : {key}"
