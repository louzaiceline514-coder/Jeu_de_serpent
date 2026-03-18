"""Tests unitaires pour le moteur de jeu."""

from game_engine.direction import Direction
from game_engine.moteur import MoteurJeu


def test_step_avance_le_serpent(moteur_initialise: MoteurJeu):
    tete_avant = moteur_initialise.serpent.tete
    moteur_initialise.step()
    assert moteur_initialise.serpent.tete != tete_avant


def test_manger_nourriture_augmente_score():
    moteur = MoteurJeu()
    # Place la nourriture juste devant la tête
    moteur.grille.nourriture = (
        moteur.serpent.tete[0] + moteur.serpent.direction.dx,
        moteur.serpent.tete[1] + moteur.serpent.direction.dy,
    )
    score_avant = moteur.score
    moteur.step()
    assert moteur.score == score_avant + 1


def test_game_over_collision_mur():
    moteur = MoteurJeu()
    moteur.serpent = moteur.serpent.__class__(0, 0, Direction.GAUCHE)
    moteur.step()
    assert moteur.game_over is True


def test_reset_reinitialise_score_et_etat():
    moteur = MoteurJeu()
    moteur.step()
    moteur.score = 5
    moteur.reset()
    assert moteur.score == 0
    assert moteur.game_over is False


def test_get_state_dict_structure():
    moteur = MoteurJeu()
    state = moteur.get_state_dict()
    assert "snake" in state
    assert "food" in state
    assert "obstacles" in state
    assert "dynamic_obstacles" in state
    assert "score" in state
    assert "game_over" in state
    assert "mode" in state
    assert "step_count" in state
    assert "growth_pending" in state


def test_mode_rl_a_des_obstacles():
    moteur = MoteurJeu()
    moteur.reset(mode="rl")
    assert len(moteur.grille.obstacles) > 0
