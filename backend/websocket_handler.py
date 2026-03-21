"""Gestion du WebSocket pour la mise à jour temps réel du jeu."""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime
from typing import Any, Dict

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from agents.agent_astar import AgentAStar
from agents.agent_rl import AgentQL
from config import EPSILON_MIN, TICK_INTERVAL_MS
from database import SessionLocal
from game_engine.direction import Direction
from game_engine.moteur import MoteurJeu
from models.agent import Agent
from models.game import Game
from models.game_event import GameEvent
from models.stats import AgentStats


class GameWebSocketManager:
    """Gère un client WebSocket et la boucle de jeu associée."""

    def __init__(self) -> None:
        self.engine = MoteurJeu()
        self.agent_astar = AgentAStar()
        self.agent_rl = AgentQL(epsilon=EPSILON_MIN)
        self._running = False
        self._last_tick = time.time()
        self._paused = True
        self._tick_ms = TICK_INTERVAL_MS
        self._game_saved = False
        self._pending_events: list[dict] = []
        self._game_start_time: float = time.time()

    async def handle(self, websocket: WebSocket) -> None:
        """Boucle principale de gestion du WebSocket."""
        await websocket.accept()
        self._running = True

        # Envoie un premier état immédiatement
        await websocket.send_text(
            json.dumps({"type": "game_state", "payload": self.engine.get_state_dict()})
        )

        producer_task = asyncio.create_task(self._tick_loop(websocket))
        consumer_task = asyncio.create_task(self._receive_loop(websocket))

        done, pending = await asyncio.wait(
            {producer_task, consumer_task},
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
            task.cancel()
        self._running = False

    async def _tick_loop(self, websocket: WebSocket) -> None:
        """Boucle envoyant l'état du jeu à intervalles réguliers."""
        try:
            while self._running:
                await asyncio.sleep(self._tick_ms / 1000.0)

                if not self._paused and not self.engine.game_over:
                    # Choix d'action par l'IA si nécessaire
                    if self.engine.mode == "astar":
                        direction = self.agent_astar.choisir_action({"engine": self.engine})
                        self.engine.changer_direction(direction)
                    elif self.engine.mode == "rl":
                        direction = self.agent_rl.choisir_action({"engine": self.engine})
                        self.engine.changer_direction(direction)

                    score_avant = self.engine.score
                    direction_avant = self.engine.serpent.direction.name
                    self.engine.step()
                    elapsed = time.time() - self._game_start_time

                    # Événement nourriture mangée
                    if self.engine.score > score_avant:
                        self._pending_events.append({
                            "type": "food",
                            "timestamp": elapsed,
                            "score": int(self.engine.score),
                            "direction": direction_avant,
                        })

                    # Événement collision / fin de partie
                    if self.engine.game_over and not self._game_saved:
                        self._pending_events.append({
                            "type": "collision",
                            "timestamp": elapsed,
                            "score": int(self.engine.score),
                            "direction": direction_avant,
                        })
                        self._enregistrer_partie()
                        self._game_saved = True

                message = {
                    "type": "game_state",
                    "payload": self.engine.get_state_dict(),
                }
                await websocket.send_text(json.dumps(message))
        except WebSocketDisconnect:
            self._running = False
        except Exception as e:
            print("Erreur tick_loop WebSocket:", repr(e))
            self._running = False

    async def _receive_loop(self, websocket: WebSocket) -> None:
        """Boucle de réception des messages du frontend."""
        try:
            while self._running:
                raw = await websocket.receive_text()
                data: Dict[str, Any] = json.loads(raw)
                msg_type = data.get("type")

                if msg_type == "set_mode":
                    mode = data.get("mode", "manual")
                    self.engine.reset(mode=mode)
                    self._paused = True
                    self._game_saved = False
                    self._pending_events = []
                    self._game_start_time = time.time()
                elif msg_type == "direction":
                    dir_str = data.get("dir")
                    direction = self._parse_direction(dir_str)
                    if direction and self.engine.mode == "manual":
                        self.engine.changer_direction(direction)
                elif msg_type == "start":
                    self._paused = False
                elif msg_type == "reset":
                    self.engine.reset(mode=self.engine.mode)
                    self._paused = True
                    self._game_saved = False
                    self._pending_events = []
                    self._game_start_time = time.time()
                elif msg_type == "set_paused":
                    self._paused = bool(data.get("paused", False))
                elif msg_type == "set_speed":
                    try:
                        speed = int(data.get("speed", TICK_INTERVAL_MS))
                        self._tick_ms = max(50, min(500, speed))
                    except (TypeError, ValueError):
                        self._tick_ms = TICK_INTERVAL_MS
        except WebSocketDisconnect:
            self._running = False
        except Exception as e:
            print("Erreur receive_loop WebSocket:", repr(e))
            self._running = False

    def _parse_direction(self, dir_str: str | None) -> Direction | None:
        """Convertit une chaîne en Direction."""
        if dir_str == "UP":
            return Direction.HAUT
        if dir_str == "DOWN":
            return Direction.BAS
        if dir_str == "LEFT":
            return Direction.GAUCHE
        if dir_str == "RIGHT":
            return Direction.DROITE
        return None

    def _enregistrer_partie(self) -> None:
        """Enregistre la partie courante dans la base de données pour l'agent actif."""
        db = SessionLocal()
        try:
            mode = self.engine.mode
            if mode == "astar":
                agent_type = "astar"
                name = "A*"
            elif mode == "rl":
                agent_type = "rl"
                name = "Q-Learning"
            else:
                agent_type = "human"
                name = "Humain"

            agent = db.query(Agent).filter(Agent.type == agent_type).first()
            if agent is None:
                agent = Agent(name=name, type=agent_type)
                db.add(agent)
                db.commit()
                db.refresh(agent)

            score = int(self.engine.score)
            nb_steps = int(self.engine.step_count)
            duration = float(time.time() - self.engine.start_time)

            game = Game(
                agent_id=agent.id,
                score=score,
                nb_steps=nb_steps,
                duration=duration,
                longueur_serpent=len(self.engine.serpent.corps),
                cause_mort=self.engine.cause_mort or "inconnu",
                taille_grille=f"{self.engine.grille.largeur}x{self.engine.grille.hauteur}",
                obstacles_actifs=len(self.engine.grille.obstacles) > 0,
                date_fin=datetime.utcnow(),
            )
            db.add(game)

            stats = db.query(AgentStats).filter(AgentStats.agent_id == agent.id).first()
            if stats is None:
                # Important : initialiser côté Python pour éviter les None avant flush/commit
                stats = AgentStats(
                    agent_id=agent.id,
                    games_played=0,
                    avg_score=0.0,
                    best_score=0,
                    win_rate=0.0,
                )
                db.add(stats)

            # Sécurisation si une ancienne ligne DB contient des NULL
            if stats.games_played is None:
                stats.games_played = 0
            if stats.avg_score is None:
                stats.avg_score = 0.0
            if stats.best_score is None:
                stats.best_score = 0
            if stats.win_rate is None:
                stats.win_rate = 0.0

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
            db.refresh(game)

            # Sauvegarde des événements (food + collision)
            for ev in self._pending_events:
                db.add(GameEvent(
                    game_id=game.id,
                    type_evenement=ev["type"],
                    timestamp=ev["timestamp"],
                    score=ev["score"],
                    direction=ev["direction"],
                ))
            db.commit()
            self._pending_events = []
        finally:
            db.close()
