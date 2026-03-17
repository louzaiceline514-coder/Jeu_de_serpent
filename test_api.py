#!/usr/bin/env python3
"""Test pour vérifier si les routes API fonctionnent."""

import requests
import json

def test_api():
    base_url = "http://127.0.0.1:8000"
    
    print("🔧 Test des routes API...")
    
    # Test health
    try:
        response = requests.get(f"{base_url}/api/health")
        print(f"✅ Health: {response.json()}")
    except Exception as e:
        print(f"❌ Health: {e}")
    
    # Test stats comparison
    try:
        response = requests.get(f"{base_url}/api/stats/comparison")
        print(f"✅ Stats comparison: {response.json()}")
    except Exception as e:
        print(f"❌ Stats comparison: {e}")
    
    # Test stats history
    try:
        response = requests.get(f"{base_url}/api/stats/history")
        data = response.json()
        print(f"✅ Stats history: {len(data)} parties")
        if data:
            print(f"   Dernière partie: {data[-1]}")
    except Exception as e:
        print(f"❌ Stats history: {e}")
    
    # Test benchmark A*
    try:
        payload = {"episodes": 5, "agent_type": "astar"}
        response = requests.post(f"{base_url}/api/training/start", json=payload)
        print(f"✅ Benchmark A*: {response.json()}")
    except Exception as e:
        print(f"❌ Benchmark A*: {e}")

if __name__ == "__main__":
    test_api()
    
    #main
