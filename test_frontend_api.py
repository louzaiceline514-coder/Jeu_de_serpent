#!/usr/bin/env python3
"""Test simulant les appels du frontend."""

import requests
import json

def test_frontend_calls():
    base_url = "http://127.0.0.1:8000"
    
    print("🔧 Test des appels API du frontend...")
    
    # Test comme le frontend ferait
    try:
        # Test stats comparison
        print("1. Test /api/stats/comparison...")
        response = requests.get(f"{base_url}/api/stats/comparison", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Données reçues: {len(data)} agents")
        else:
            print(f"   ❌ Erreur: {response.text}")
            
        # Test stats history
        print("\n2. Test /api/stats/history...")
        response = requests.get(f"{base_url}/api/stats/history", timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Historique: {len(data)} parties")
        else:
            print(f"   ❌ Erreur: {response.text}")
            
        # Test benchmark A*
        print("\n3. Test benchmark A*...")
        payload = {"episodes": 50, "agent_type": "astar"}
        response = requests.post(f"{base_url}/api/training/start", json=payload, timeout=30)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Benchmark A*: {data.get('status')}")
        else:
            print(f"   ❌ Erreur: {response.text}")
            
        # Test benchmark RL
        print("\n4. Test benchmark RL...")
        payload = {"episodes": 50, "agent_type": "rl"}
        response = requests.post(f"{base_url}/api/training/start", json=payload, timeout=30)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Benchmark RL: {data.get('status')}")
        else:
            print(f"   ❌ Erreur: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")

if __name__ == "__main__":
    test_frontend_calls()
