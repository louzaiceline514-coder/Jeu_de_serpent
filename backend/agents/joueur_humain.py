"""Agent représentant un joueur humain — transmet la direction clavier au moteur."""

from __future__ import annotations

from typing import Any, Dict

from agents.base_agent import Agent
from game_engine.direction import Direction


_MAP: Dict[str, Direction] = {
    "UP": Direction.HAUT,
    "DOWN": Direction.BAS,
    "LEFT": Direction.GAUCHE,
    "RIGHT": Direction.DROITE,
    "HAUT": Direction.HAUT,
    "BAS": Direction.BAS,
    "GAUCHE": Direction.GAUCHE,
    "DROITE": Direction.DROITE,
}


class JoueurHumain(Agent):
    """Agent passif qui relaie la saisie clavier du joueur humain.

    L'état attendu est un dict contenant :
    - ``"direction"`` (str) : direction voulue par le joueur (ex. ``"UP"``)
    - ``"engine"`` (MoteurJeu) : moteur courant, utilisé pour le fallback

    Si la direction est absente ou invalide, la direction courante du serpent
    est conservée (aucun demi-tour n'est introduit).
    """

    def __init__(self) -> None:
        super().__init__(name="Humain")

    def choisir_action(self, state: Dict[str, Any]) -> Direction:
        """Retourne la direction fournie par le joueur, ou conserve l'actuelle."""
        dir_str: str | None = state.get("direction")
        if dir_str and dir_str.upper() in _MAP:
            return _MAP[dir_str.upper()]

        # Fallback : direction courante du serpent (aucun changement)
        engine = state.get("engine")
        if engine is not None:
            return engine.serpent.direction

        return Direction.DROITE
