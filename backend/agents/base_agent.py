"""Classe de base abstraite pour les agents Snake."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict

from game_engine.direction import Direction


class Agent(ABC):
    """Interface minimale que doivent implémenter tous les agents."""

    def __init__(self, name: str) -> None:
        self.name = name

    @abstractmethod
    def choisir_action(self, state: Dict[str, Any]) -> Direction:
        """Choisit une direction à partir de l'état courant du jeu."""
        raise NotImplementedError

