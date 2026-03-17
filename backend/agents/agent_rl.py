"""Agent IA utilisant le Q-Learning pour apprendre à jouer au Snake."""

from __future__ import annotations

import json
import math
import random
from typing import Any, Dict, List, Tuple

from config import (
    ALPHA,
    EPSILON_DECAY,
    EPSILON_MIN,
    EPSILON_START,
    GAMMA,
    QTABLE_PATH,
)
from game_engine.direction import Direction
from game_engine.moteur import MoteurJeu
from agents.base_agent import Agent

StateKey = Tuple[int, ...]


class AgentQL(Agent):
    """Agent Q-Learning avec encodage d'état binaire (11 features)."""

    def __init__(self) -> None:
        super().__init__(name="Q-Learning")
        self.alpha = ALPHA
        self.gamma = GAMMA
        self.epsilon = 0.1  # Réduit pour plus d'exploitation
        self.q_table: Dict[str, List[float]] = {}
        self.actions = [Direction.GAUCHE, Direction.DROITE, Direction.HAUT, Direction.BAS]
        self.charger_qtable()

    # ------------------ Gestion Q-table ------------------ #
    def _state_to_key(self, state: StateKey) -> str:
        return ",".join(str(v) for v in state)

    def obtenir_q_valeurs(self, state: StateKey) -> List[float]:
        key = self._state_to_key(state)
        if key not in self.q_table:
            self.q_table[key] = [0.0 for _ in self.actions]
        return self.q_table[key]

    def sauvegarder_qtable(self) -> None:
        """Sauvegarde la Q-table dans un fichier JSON."""
        QTABLE_PATH.write_text(json.dumps(self.q_table))

    def charger_qtable(self) -> None:
        """Charge la Q-table depuis le fichier JSON si disponible."""
        if QTABLE_PATH.exists():
            try:
                self.q_table = json.loads(QTABLE_PATH.read_text())
            except Exception:
                self.q_table = {}

    # ------------------ Encodage d'état ------------------ #
    def encoder_etat(self, moteur: MoteurJeu) -> StateKey:
        """Encode l'état du jeu en 11 caractéristiques binaires.

        (danger_straight, danger_left, danger_right,
         dir_up, dir_down, dir_left, dir_right,
         food_up, food_down, food_left, food_right)
        """
        tete_x, tete_y = moteur.serpent.tete
        dir_actuelle = moteur.serpent.direction
        food = moteur.grille.nourriture

        def danger_si_direction(direction: Direction) -> int:
            nx, ny = tete_x + direction.dx, tete_y + direction.dy
            if not moteur.grille.est_dans_grille(nx, ny):
                return 1
            if (nx, ny) in moteur.grille.obstacles:
                return 1
            if (nx, ny) in list(moteur.serpent.corps)[1:]:
                return 1
            return 0

        # Orientation relative : avant/gauche/droite par rapport à la direction actuelle
        if dir_actuelle == Direction.HAUT:
            dir_straight, dir_left, dir_right = Direction.HAUT, Direction.GAUCHE, Direction.DROITE
        elif dir_actuelle == Direction.BAS:
            dir_straight, dir_left, dir_right = Direction.BAS, Direction.DROITE, Direction.GAUCHE
        elif dir_actuelle == Direction.GAUCHE:
            dir_straight, dir_left, dir_right = Direction.GAUCHE, Direction.BAS, Direction.HAUT
        else:
            dir_straight, dir_left, dir_right = Direction.DROITE, Direction.HAUT, Direction.BAS

        danger_straight = danger_si_direction(dir_straight)
        danger_left = danger_si_direction(dir_left)
        danger_right = danger_si_direction(dir_right)

        dir_up = 1 if dir_actuelle == Direction.HAUT else 0
        dir_down = 1 if dir_actuelle == Direction.BAS else 0
        dir_left = 1 if dir_actuelle == Direction.GAUCHE else 0
        dir_right = 1 if dir_actuelle == Direction.DROITE else 0

        food_up = food_down = food_left = food_right = 0
        if food:
            fx, fy = food
            if fy < tete_y:
                food_up = 1
            elif fy > tete_y:
                food_down = 1
            if fx < tete_x:
                food_left = 1
            elif fx > tete_x:
                food_right = 1

        return (
            danger_straight,
            danger_left,
            danger_right,
            dir_up,
            dir_down,
            dir_left,
            dir_right,
            food_up,
            food_down,
            food_left,
            food_right,
        )

    # ------------------ Politique et mise à jour ------------------ #
    def choisir_action(self, state: Dict[str, Any]) -> Direction:
        """Politique epsilon-greedy basée sur la Q-table."""
        moteur: MoteurJeu = state["engine"]
        encoded = self.encoder_etat(moteur)
        q_vals = self.obtenir_q_valeurs(encoded)

        if random.random() < self.epsilon:
            action_index = random.randint(0, len(self.actions) - 1)
        else:
            max_q = max(q_vals)
            meilleurs = [i for i, q in enumerate(q_vals) if math.isclose(q, max_q) or q == max_q]
            action_index = random.choice(meilleurs)
        return self.actions[action_index]

    def update_Q(
        self,
        state: StateKey,
        action: Direction,
        reward: float,
        next_state: StateKey,
    ) -> None:
        """Met à jour la Q-table via l'équation de Bellman."""
        q_vals = self.obtenir_q_valeurs(state)
        next_q_vals = self.obtenir_q_valeurs(next_state)
        a_idx = self.actions.index(action)
        old_q = q_vals[a_idx]
        target = reward + self.gamma * max(next_q_vals)
        q_vals[a_idx] = old_q + self.alpha * (target - old_q)

    # ------------------ Boucle d'entraînement ------------------ #
    def entrainer(self, nb_episodes: int, env: MoteurJeu) -> List[float]:
        """Boucle d'entraînement RL sur N épisodes, retourne la liste des scores.

        Récompenses conformes à la spécification :
        +10 manger, -10 mourir, +1 se rapprocher de la nourriture, -1 s'en éloigner.
        """
        scores: List[float] = []

        for _ in range(nb_episodes):
            env.reset(mode="rl")
            state = self.encoder_etat(env)
            prev_score = env.score

            while not env.game_over:
                action = self.choisir_action({"engine": env})
                env.changer_direction(action)

                # Distance à la nourriture avant déplacement
                prev_dist = None
                if env.grille.nourriture:
                    fx, fy = env.grille.nourriture
                    sx, sy = env.serpent.tete
                    prev_dist = abs(fx - sx) + abs(fy - sy)

                env.step()

                reward = 0.0
                if env.game_over:
                    reward -= 10.0
                else:
                    # Distance après déplacement
                    if env.grille.nourriture and prev_dist is not None:
                        fx, fy = env.grille.nourriture
                        sx, sy = env.serpent.tete
                        new_dist = abs(fx - sx) + abs(fy - sy)
                        if new_dist < prev_dist:
                            reward += 1.0
                        elif new_dist > prev_dist:
                            reward -= 1.0

                    # Pomme mangée : le score vient d'augmenter
                    if env.score > prev_score:
                        reward += 10.0
                        prev_score = env.score

                next_state = self.encoder_etat(env)
                self.update_Q(state, action, reward, next_state)
                state = next_state

            scores.append(env.score)
            # Décroissance de epsilon
            if self.epsilon > EPSILON_MIN:
                self.epsilon *= EPSILON_DECAY

        self.sauvegarder_qtable()
        return scores

