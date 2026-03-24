"""Tests des classes du diagramme de conception : Nourriture, Obstacle,
CollecteurStatistiques et ControleurJeu."""

import pytest

from game_engine.nourriture import Nourriture
from game_engine.obstacle import Obstacle
from game_engine.collecteur_statistiques import CollecteurStatistiques
from game_engine.controleur_jeu import ControleurJeu
from game_engine.direction import Direction


# ---------------------------------------------------------------------------
# Nourriture
# ---------------------------------------------------------------------------

class TestNourriture:
    def test_position_initiale_none(self):
        n = Nourriture()
        assert n.position is None
        assert not n.est_presente()

    def test_position_initiale_fournie(self):
        n = Nourriture((5, 5))
        assert n.est_presente()
        assert n.position == (5, 5)

    def test_placer(self):
        n = Nourriture()
        n.placer((3, 7))
        assert n.position == (3, 7)
        assert n.est_presente()

    def test_effacer(self):
        n = Nourriture((3, 7))
        n.effacer()
        assert not n.est_presente()
        assert n.position is None

    def test_egalite(self):
        assert Nourriture((1, 2)) == Nourriture((1, 2))
        assert Nourriture((1, 2)) != Nourriture((3, 4))

    def test_repr(self):
        n = Nourriture((2, 3))
        assert "Nourriture" in repr(n)
        assert "(2, 3)" in repr(n)


# ---------------------------------------------------------------------------
# Obstacle
# ---------------------------------------------------------------------------

class TestObstacle:
    def test_statique_par_defaut(self):
        o = Obstacle((4, 4))
        assert o.est_statique()
        assert o.type_obstacle == Obstacle.TYPE_STATIQUE

    def test_dynamique(self):
        o = Obstacle((2, 2), Obstacle.TYPE_DYNAMIQUE, age=3)
        assert not o.est_statique()
        assert o.age == 3

    def test_statique_toujours_actif(self):
        o = Obstacle((1, 1), Obstacle.TYPE_STATIQUE)
        assert o.est_actif(lifetime=0)
        assert o.est_actif(lifetime=999)

    def test_dynamique_expire_apres_lifetime(self):
        o = Obstacle((1, 1), Obstacle.TYPE_DYNAMIQUE, age=10)
        assert not o.est_actif(lifetime=5)
        assert o.est_actif(lifetime=15)

    def test_vieillir_dynamique(self):
        o = Obstacle((1, 1), Obstacle.TYPE_DYNAMIQUE, age=0)
        o.vieillir()
        assert o.age == 1

    def test_vieillir_statique_ne_change_pas(self):
        o = Obstacle((1, 1), Obstacle.TYPE_STATIQUE, age=0)
        o.vieillir()
        assert o.age == 0  # statique : l'âge ne change pas

    def test_repr(self):
        o = Obstacle((3, 5), Obstacle.TYPE_DYNAMIQUE, age=2)
        r = repr(o)
        assert "Obstacle" in r
        assert "dynamique" in r


# ---------------------------------------------------------------------------
# CollecteurStatistiques
# ---------------------------------------------------------------------------

class TestCollecteurStatistiques:
    def test_vide_par_defaut(self):
        c = CollecteurStatistiques()
        assert c.nb_parties == 0
        assert c.score_moyen == 0.0
        assert c.score_median == 0.0
        assert c.meilleur_score == 0
        assert c.taux_survie == 0.0

    def test_enregistrer_une_partie(self):
        c = CollecteurStatistiques()
        c.enregistrer_partie(score=5, steps=100, longueur=6, cause_mort="mur")
        assert c.nb_parties == 1
        assert c.score_moyen == 5.0
        assert c.meilleur_score == 5

    def test_score_moyen_plusieurs_parties(self):
        c = CollecteurStatistiques()
        for score in [2, 4, 6]:
            c.enregistrer_partie(score=score, steps=50, longueur=score + 1, cause_mort="mur")
        assert c.score_moyen == 4.0

    def test_score_median(self):
        c = CollecteurStatistiques()
        for score in [1, 3, 10]:
            c.enregistrer_partie(score=score, steps=50, longueur=2, cause_mort="mur")
        assert c.score_median == 3.0

    def test_taux_survie(self):
        c = CollecteurStatistiques()
        c.enregistrer_partie(score=0, steps=5, longueur=1, cause_mort="mur")
        c.enregistrer_partie(score=3, steps=50, longueur=4, cause_mort="corps")
        c.enregistrer_partie(score=7, steps=100, longueur=8, cause_mort="obstacle")
        assert abs(c.taux_survie - 2 / 3) < 1e-9

    def test_meilleur_score(self):
        c = CollecteurStatistiques()
        for s in [1, 10, 5, 8]:
            c.enregistrer_partie(score=s, steps=50, longueur=2, cause_mort="mur")
        assert c.meilleur_score == 10

    def test_reinitialiser(self):
        c = CollecteurStatistiques()
        c.enregistrer_partie(score=5, steps=50, longueur=6, cause_mort="mur")
        c.reinitialiser()
        assert c.nb_parties == 0

    def test_to_dict_cles(self):
        c = CollecteurStatistiques()
        c.enregistrer_partie(score=3, steps=60, longueur=4, cause_mort="mur")
        d = c.to_dict()
        for key in ("nb_parties", "score_moyen", "score_median", "meilleur_score", "taux_survie"):
            assert key in d


# ---------------------------------------------------------------------------
# ControleurJeu
# ---------------------------------------------------------------------------

class TestControleurJeu:
    def test_creation_etat_initial(self):
        ctrl = ControleurJeu(mode="manual")
        assert not ctrl.game_over
        assert ctrl.score == 0
        assert ctrl.step_count == 0
        assert ctrl.nourriture.est_presente()

    def test_reset(self):
        ctrl = ControleurJeu(mode="astar")
        for _ in range(10):
            if not ctrl.game_over:
                ctrl.step()
        ctrl.reset(mode="manual")
        assert not ctrl.game_over
        assert ctrl.score == 0
        assert ctrl.step_count == 0

    def test_step_incremente_compteur(self):
        ctrl = ControleurJeu(mode="manual")
        ctrl.step()
        assert ctrl.step_count == 1

    def test_game_over_enregistre_statistiques(self):
        ctrl = ControleurJeu(mode="manual")
        # Force un game over immédiat : tête au bord gauche, direction gauche
        ctrl.moteur.serpent.corps = [(0, 10)]
        ctrl.moteur.serpent.direction = Direction.GAUCHE
        ctrl.moteur.static_obstacles = set()
        ctrl.moteur.dynamic_obstacles = {}
        ctrl.moteur._refresh_obstacles()
        ctrl.step()
        assert ctrl.game_over
        assert ctrl.collecteur.nb_parties == 1

    def test_get_obstacles_retourne_liste(self):
        ctrl = ControleurJeu(mode="astar")
        obstacles = ctrl.get_obstacles()
        assert isinstance(obstacles, list)
        for o in obstacles:
            assert isinstance(o, Obstacle)

    def test_changer_direction_transmis(self):
        ctrl = ControleurJeu(mode="manual")
        ctrl.changer_direction(Direction.HAUT)
        assert ctrl.moteur.serpent.direction == Direction.HAUT

    def test_get_state_dict_structure(self):
        ctrl = ControleurJeu(mode="manual")
        state = ctrl.get_state_dict()
        for key in ("snake", "food", "score", "game_over", "step_count"):
            assert key in state

    def test_nourriture_synchronisee_apres_step(self):
        ctrl = ControleurJeu(mode="manual")
        # Place la nourriture juste devant la tête
        tete_x, tete_y = ctrl.moteur.serpent.tete
        direction = ctrl.moteur.serpent.direction
        ctrl.moteur.grille.nourriture = (tete_x + direction.dx, tete_y + direction.dy)
        score_avant = ctrl.score
        ctrl.step()
        # La nourriture a été mangée, une nouvelle est générée
        assert ctrl.score > score_avant
        # La nourriture dans le contrôleur doit être synchronisée
        assert ctrl.nourriture.position == ctrl.moteur.grille.nourriture

    def test_collecteur_plusieurs_parties(self):
        ctrl = ControleurJeu(mode="manual")
        for _ in range(3):
            ctrl.moteur.serpent.corps = [(0, 10)]
            ctrl.moteur.serpent.direction = Direction.GAUCHE
            ctrl.moteur.static_obstacles = set()
            ctrl.moteur.dynamic_obstacles = {}
            ctrl.moteur._refresh_obstacles()
            ctrl.step()
            ctrl.reset(mode="manual")
        assert ctrl.collecteur.nb_parties == 3
