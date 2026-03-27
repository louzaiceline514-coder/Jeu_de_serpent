"""Enumération des états possibles du jeu."""

from enum import Enum


class EtatJeu(str, Enum):
    """État courant du moteur de jeu.

    Hérite de ``str`` pour permettre la sérialisation JSON directe
    (``json.dumps`` n'a pas besoin de convertisseur spécial).
    """

    EN_COURS = "en_cours"
    GAME_OVER = "game_over"
    PAUSE = "pause"
