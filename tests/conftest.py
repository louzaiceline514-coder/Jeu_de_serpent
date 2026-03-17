"""Fixtures communes pour les tests pytest."""

import sys
from pathlib import Path

import pytest

# Ajout du dossier `backend` au PYTHONPATH pour importer comme dans `uvicorn main:app`
ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from game_engine.direction import Direction  # noqa: E402
from game_engine.grille import Grille  # noqa: E402
from game_engine.moteur import MoteurJeu  # noqa: E402
from game_engine.serpent import Serpent  # noqa: E402


@pytest.fixture
def grille_vide() -> Grille:
    """Retourne une grille vide 20x20."""
    return Grille(20, 20)


@pytest.fixture
def serpent_centre() -> Serpent:
    """Retourne un serpent positionné au centre avec direction DROITE."""
    return Serpent(10, 10, Direction.DROITE)


@pytest.fixture
def moteur_initialise() -> MoteurJeu:
    """Retourne un moteur de jeu initialisé."""
    return MoteurJeu()

