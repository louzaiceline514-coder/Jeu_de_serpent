"""Boucle d'entraînement pour l'agent Q-Learning."""

from __future__ import annotations

import csv
from pathlib import Path
import time
from typing import Callable, List, Optional

from agents.agent_rl import AgentQL
from database import SessionLocal
from game_engine.moteur import MoteurJeu
from models.agent import Agent
from models.game import Game
from models.stats import AgentStats


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

        # Boucle d'entraînement avec persistance des parties en base
        db = SessionLocal()
        try:
            # Récupération ou création de l'agent RL
            agent = db.query(Agent).filter(Agent.type == "rl").first()
            if agent is None:
                agent = Agent(name="Q-Learning", type="rl")
                db.add(agent)
                db.commit()
                db.refresh(agent)

            for episode in range(1, nb_episodes + 1):
                # Reset de l'environnement et mesure du temps
                self.moteur.reset(mode="rl")
                start_time = time.time()

                # Une session d'entraînement dans l'environnement
                scores = self.agent.entrainer(1, self.moteur)
                score = int(scores[-1]) if scores else 0
                duration = float(time.time() - start_time)
                nb_steps = self.moteur.step_count

                # Sauvegarde de la partie dans la table Game
                game = Game(
                    agent_id=agent.id,
                    score=score,
                    nb_steps=nb_steps,
                    duration=duration,
                )
                db.add(game)

                # Mise à jour des statistiques agrégées
                stats = db.query(AgentStats).filter(AgentStats.agent_id == agent.id).first()
                if stats is None:
                    stats = AgentStats(
                        agent_id=agent.id,
                        games_played=0,
                        avg_score=0.0,
                        best_score=0,
                        win_rate=0.0,
                    )
                    db.add(stats)

                if stats.games_played is None:
                    stats.games_played = 0
                if stats.avg_score is None:
                    stats.avg_score = 0.0
                if stats.best_score is None:
                    stats.best_score = 0
                if stats.win_rate is None:
                    stats.win_rate = 0.0

                # mise à jour incrémentale
                old_games = stats.games_played
                stats.games_played = stats.games_played + 1
                stats.best_score = max(stats.best_score, score)
                stats.avg_score = (
                    (stats.avg_score * old_games + score) / stats.games_played
                    if stats.games_played > 0
                    else 0.0
                )
                wins = stats.win_rate * old_games
                if score > 0:
                    wins += 1
                stats.win_rate = wins / stats.games_played if stats.games_played > 0 else 0.0

                db.commit()

                self._scores.append(score)
                if callback_progression:
                    callback_progression(episode, nb_episodes, score)
        finally:
            db.close()

        # Sauvegarde des scores dans un fichier CSV
        self.sortie_csv.parent.mkdir(parents=True, exist_ok=True)
        with self.sortie_csv.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["episode", "score"])
            for i, score in enumerate(self._scores):
                writer.writerow([i + 1, score])

        self._en_cours = False

