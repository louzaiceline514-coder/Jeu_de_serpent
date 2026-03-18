"""Boucle d'entraînement pour l'agent Q-Learning."""

from __future__ import annotations

import time
from typing import Callable, List, Optional

from agents.agent_rl import AgentQL
from game_engine.moteur import MoteurJeu
import csv
from pathlib import Path


class Trainer:
    """Gère l'entraînement d'un agent RL sur plusieurs épisodes."""

    def __init__(self, sortie_csv: Path) -> None:
        self.sortie_csv = sortie_csv
        self.agent = AgentQL()
        self.moteur = MoteurJeu()
        self._en_cours: bool = False
        self._scores: List[int] = []

    @property
    def en_cours(self) -> bool:
        """Indique si un entraînement est en cours."""
        return self._en_cours

    @property
    def scores(self) -> List[int]:
        """Retourne la liste des scores enregistrés lors du dernier entraînement."""
        return list(self._scores)

    def entrainer(
        self,
        nb_episodes: int,
        callback_progression: Optional[Callable[[int, int, int], None]] = None,
    ) -> None:
        """Lance la boucle d'entraînement RL et sauvegarde les résultats dans un CSV.

        :param nb_episodes: nombre d'épisodes d'entraînement
        :param callback_progression: fonction appelée périodiquement (episode, nb_episodes, score)
        """
        self._en_cours = True
        self._scores = []

        try:
            for episode in range(1, nb_episodes + 1):
                # Reset de l'environnement et mesure du temps
                self.moteur.reset(mode="rl")
                start_time = time.time()

                # Une session d'entraînement dans l'environnement
                scores = self.agent.entrainer(1, self.moteur)
                score = int(scores[-1]) if scores else 0
                _ = float(time.time() - start_time)

                self._scores.append(score)
                if callback_progression:
                    callback_progression(episode, nb_episodes, score)
        finally:
            self._en_cours = False

        # Sauvegarde des scores dans un fichier CSV
        self.sortie_csv.parent.mkdir(parents=True, exist_ok=True)
        with self.sortie_csv.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["episode", "score"])
            for i, score in enumerate(self._scores):
                writer.writerow([i + 1, score])
