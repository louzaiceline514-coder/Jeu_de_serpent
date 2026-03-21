"""Tests unitaires pour l'agent Q-Learning."""
import pytest
from agents.agent_rl import AgentQL
from game_engine.moteur import MoteurJeu
from game_engine.direction import Direction


def test_rl_retourne_direction_valide():
    """L'agent RL retourne toujours une Direction valide."""
    agent = AgentQL(epsilon=0.0)
    moteur = MoteurJeu()
    moteur.reset(mode="rl")
    direction = agent.choisir_action({"engine": moteur})
    assert direction in list(Direction)


def test_encodage_etat_longueur():
    """L'encodage produit un vecteur de 11 features binaires."""
    agent = AgentQL()
    moteur = MoteurJeu()
    moteur.reset(mode="rl")
    # encoder_etat prend le moteur directement (pas le dict)
    etat = agent.encoder_etat(moteur)
    assert len(etat) == 11
    assert all(v in (0, 1) for v in etat)


def test_epsilon_greedy_exploration():
    """Avec epsilon=1, l'agent explore toujours (action aléatoire)."""
    agent = AgentQL(epsilon=1.0)
    moteur = MoteurJeu()
    moteur.reset(mode="rl")
    directions = set()
    for _ in range(50):
        d = agent.choisir_action({"engine": moteur})
        directions.add(d)
    # Avec 50 essais et exploration totale, on doit voir plusieurs directions
    assert len(directions) > 1


def test_epsilon_greedy_exploitation():
    """Avec epsilon=0, l'agent exploite la meilleure Q-valeur."""
    agent = AgentQL(epsilon=0.0)
    moteur = MoteurJeu()
    moteur.reset(mode="rl")
    etat = agent.encoder_etat(moteur)
    # Force une valeur très haute pour Direction.DROITE dans la Q-table
    key = agent._state_to_key(etat)
    # actions = [GAUCHE, DROITE, HAUT, BAS] → DROITE est à l'index 1
    droite_idx = agent.actions.index(Direction.DROITE)
    q_vals = [0.0] * len(agent.actions)
    q_vals[droite_idx] = 100.0
    agent.q_table[key] = q_vals
    direction = agent.choisir_action({"engine": moteur})
    assert direction == Direction.DROITE


def test_mise_a_jour_q_table():
    """La mise à jour Q-table modifie bien la valeur pour (état, action)."""
    agent = AgentQL(epsilon=0.0)
    # Repart d'une Q-table vide pour ne pas dépendre de la Q-table sauvegardée sur disque
    agent.q_table = {}
    moteur = MoteurJeu()
    moteur.reset(mode="rl")
    etat = agent.encoder_etat(moteur)
    droite_idx = agent.actions.index(Direction.DROITE)
    # Valeur initiale = 0 (Q-table vide)
    assert agent.obtenir_q_valeurs(etat)[droite_idx] == 0.0
    # Simule une récompense positive via update_Q
    agent.update_Q(etat, Direction.DROITE, reward=10.0, next_state=etat)
    assert agent.obtenir_q_valeurs(etat)[droite_idx] > 0.0
