"""Tests unitaires pour l'agent Q-Learning."""

from agents.agent_rl import AgentQL
from game_engine.moteur import MoteurJeu


def test_encoder_etat_longueur_11():
    agent = AgentQL()
    moteur = MoteurJeu()
    state = agent.encoder_etat(moteur)
    assert isinstance(state, tuple)
    assert len(state) == 11


def test_update_q_modifie_table():
    agent = AgentQL()
    moteur = MoteurJeu()
    s1 = agent.encoder_etat(moteur)
    s2 = agent.encoder_etat(moteur)
    action = agent.actions[0]
    key = agent._state_to_key(s1)
    before = list(agent.obtenir_q_valeurs(s1))
    agent.update_Q(s1, action, reward=1.0, next_state=s2)
    after = agent.obtenir_q_valeurs(s1)
    assert before != after
    assert key in agent.q_table


def test_epsilon_decroit_apres_entrainement():
    agent = AgentQL()
    moteur = MoteurJeu()
    epsilon_initial = agent.epsilon
    agent.entrainer(5, moteur)
    assert agent.epsilon <= epsilon_initial


def test_choisir_action_retourne_direction():
    agent = AgentQL()
    moteur = MoteurJeu()
    direction = agent.choisir_action({"engine": moteur})
    assert direction in agent.actions

