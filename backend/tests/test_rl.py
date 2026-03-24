"""Tests unitaires pour l'agent Q-Learning."""
import pytest
from agents.agent_rl import AgentQL
from game_engine.moteur import MoteurJeu
from game_engine.direction import Direction
from config import ALPHA, GAMMA, EPSILON_DECAY, EPSILON_MIN


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


def test_bellman_valeur_exacte():
    """L'équation de Bellman Q = Q + alpha*(r + gamma*max_next - Q) est appliquée exactement."""
    agent = AgentQL(epsilon=0.0)
    agent.q_table = {}
    moteur = MoteurJeu()
    moteur.reset(mode="rl")
    etat = agent.encoder_etat(moteur)
    key = agent._state_to_key(etat)
    # Force toutes les Q-valeurs à 0
    agent.q_table[key] = [0.0, 0.0, 0.0, 0.0]

    reward = 10.0
    # next_state identique à etat, toutes les Q-valeurs = 0 → max_next = 0
    agent.update_Q(etat, Direction.DROITE, reward=reward, next_state=etat)

    droite_idx = agent.actions.index(Direction.DROITE)
    expected = 0.0 + ALPHA * (reward + GAMMA * 0.0 - 0.0)
    assert abs(agent.obtenir_q_valeurs(etat)[droite_idx] - expected) < 1e-9


def test_epsilon_decay_apres_episode():
    """Epsilon décroît après chaque épisode d'entraînement."""
    agent = AgentQL(epsilon=0.5)
    agent.q_table = {}
    moteur = MoteurJeu()
    moteur.reset(mode="training")
    # Provoque un game_over immédiat : tête au bord gauche allant à gauche
    moteur.serpent.corps = [(0, 10)]
    moteur.serpent.direction = Direction.GAUCHE
    moteur.static_obstacles = set()
    moteur.dynamic_obstacles = {}
    moteur._refresh_obstacles()

    epsilon_avant = agent.epsilon
    agent.entrainer(1, moteur)
    assert agent.epsilon <= epsilon_avant


def test_epsilon_ne_descend_pas_sous_minimum():
    """Epsilon ne descend jamais en dessous de EPSILON_MIN."""
    agent = AgentQL(epsilon=EPSILON_MIN)
    agent.q_table = {}
    moteur = MoteurJeu()
    moteur.reset(mode="training")
    moteur.serpent.corps = [(0, 10)]
    moteur.serpent.direction = Direction.GAUCHE
    moteur.static_obstacles = set()
    moteur.dynamic_obstacles = {}
    moteur._refresh_obstacles()

    agent.entrainer(5, moteur)
    assert agent.epsilon >= EPSILON_MIN


def test_sauvegarde_chargement_qtable(tmp_path, monkeypatch):
    """Q-table sauvegardée sur disque puis rechargée correctement."""
    import agents.agent_rl as agent_rl_mod
    qtable_file = tmp_path / "qtable_test.json"
    monkeypatch.setattr(agent_rl_mod, "QTABLE_PATH", qtable_file)

    agent = AgentQL(epsilon=0.0)
    agent.q_table = {"1,0,0,0,0,0,1,0,1,0,0": [1.0, 2.0, 3.0, 4.0]}
    agent.sauvegarder_qtable()

    agent2 = AgentQL(epsilon=0.0)
    assert "1,0,0,0,0,0,1,0,1,0,0" in agent2.q_table
    assert agent2.q_table["1,0,0,0,0,0,1,0,1,0,0"] == [1.0, 2.0, 3.0, 4.0]


def test_qtable_corrompue_donne_table_vide(tmp_path, monkeypatch):
    """Un fichier Q-table corrompu → table vide, pas d'exception."""
    import agents.agent_rl as agent_rl_mod
    qtable_file = tmp_path / "qtable_bad.json"
    qtable_file.write_text("NOT JSON {{{", encoding="utf-8")
    monkeypatch.setattr(agent_rl_mod, "QTABLE_PATH", qtable_file)

    agent = AgentQL(epsilon=0.0)
    assert agent.q_table == {}
