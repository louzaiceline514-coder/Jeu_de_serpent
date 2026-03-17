#!/usr/bin/env python3 python3
"""Test simple pour vérifier la connexion WebSocket."""

import asyncio
import websockets
import json

async def test_websocket():
    try:
        uri = "ws://127.0.0.1:8000/ws"
        print(f"Tentative de connexion à {uri}...")
        
        async with websockets.connect(uri) as websocket:
            print("✅ Connexion WebSocket établie!")
            
            # Envoyer un message reset
            await websocket.send(json.dumps({"type": "reset"}))
            print("📤 Message reset envoyé")
            
            # Attendre une réponse
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📥 Réponse reçue: {data['type']}")
            
            if data['type'] == 'game_state':
                payload = data['payload']
                print(f"🎮 État du jeu:")
                print(f"   - Serpent: {len(payload['snake'])} segments")
                print(f"   - Nourriture: {payload['food']}")
                print(f"   - Score: {payload['score']}")
                print(f"   - Mode: {payload['mode']}")
                
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
