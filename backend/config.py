"""Configuration globale du backend Snake AI."""

import os
from pathlib import Path
from typing import Dict, List

# Taille de la grille (carrée)
GRID_SIZE: int = int(os.getenv("GRID_SIZE", "20"))

# Base directory du projet
BASE_DIR = Path(__file__).resolve().parent.parent

# URL de la base SQLite (fichier snake.db à la racine du projet)
DB_PATH = BASE_DIR / "snake.db"
DB_URL: str = f"sqlite:///{DB_PATH}"

# Origines autorisées pour le CORS (frontend Vite par défaut)
# On autorise 5173 et 5174 car Vite peut choisir un port libre.
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
]

# Paramètres du moteur de jeu
TICK_INTERVAL_MS: int = int(os.getenv("TICK_INTERVAL_MS", "150"))

OBSTACLE_SETTINGS: Dict[str, Dict[str, int]] = {
    "manual": {
        "static_obstacles": 10,
        "spawn_interval": 6,
        "max_dynamic_obstacles": 5,
        "dynamic_lifetime": 10,
    },
    "astar": {
        "static_obstacles": 12,
        "spawn_interval": 5,
        "max_dynamic_obstacles": 6,
        "dynamic_lifetime": 10,
    },
    "rl": {
        "static_obstacles": 6,
        "spawn_interval": 7,
        "max_dynamic_obstacles": 4,
        "dynamic_lifetime": 9,
    },
    "training": {
        "static_obstacles": 4,
        "spawn_interval": 8,
        "max_dynamic_obstacles": 3,
        "dynamic_lifetime": 8,
    },
    "battle": {
        "static_obstacles": 8,
        "spawn_interval": 5,
        "max_dynamic_obstacles": 5,
        "dynamic_lifetime": 10,
    },
}

# Paramètres du Q-Learning
ALPHA: float = float(os.getenv("RL_ALPHA", "0.1"))          # taux d'apprentissage
GAMMA: float = float(os.getenv("RL_GAMMA", "0.9"))          # facteur de réduction
EPSILON_START: float = float(os.getenv("RL_EPSILON_START", "1.0"))
EPSILON_MIN: float = float(os.getenv("RL_EPSILON_MIN", "0.01"))
EPSILON_DECAY: float = float(os.getenv("RL_EPSILON_DECAY", "0.995"))

# Fichier de sauvegarde de la Q-table
QTABLE_PATH = BASE_DIR / "qtable.json"
