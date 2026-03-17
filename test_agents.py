#!/usr/bin/env python3
"""Test pour vérifier si les agents IA fonctionnent."""

import sys
sys.path.append('backend')

from backend.game_engine.moteur import MoteurJeu
from backend.agents.agent_astar import AgentAStar
from backend.agents.agent_rl import AgentQL

def test_agents():
    moteur = MoteurJeu()
    agent_astar = AgentAStar()
    agent_rl = AgentQL()
    
    print("🎮 Test des agents IA...")
    print(f"État initial: serpent={moteur.serpent.tete}, nourriture={moteur.grille.nourriture}")
    
    # Test A*
    print("\n🤖 Test Agent A*:")
    for i in range(3):
        direction = agent_astar.choisir_action({"engine": moteur})
        print(f"  Step {i+1}: direction={direction}")
        moteur.changer_direction(direction)
        moteur.step()
        if moteur.game_over:
            print(f"  Game over après {i+1} steps")
            break
    
    # Reset pour RL
    moteur.reset()
    
    # Test Q-Learning
    print("\n🧠 Test Agent Q-Learning:")
    for i in range(3):
        direction = agent_rl.choisir_action({"engine": moteur})
        print(f"  Step {i+1}: direction={direction}")
        moteur.changer_direction(direction)
        moteur.step()
        if moteur.game_over:
            print(f"  Game over après {i+1} steps")
            break
    
    print("\n✅ Test terminé!")

if __name__ == "__main__":
    test_agents()
