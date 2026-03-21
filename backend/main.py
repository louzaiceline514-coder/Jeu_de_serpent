"""Point d'entrée FastAPI du backend Snake AI."""

from __future__ import annotations

import orjson
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

# IMPORTANT :
# Ce projet doit pouvoir être lancé depuis le dossier `backend` avec :
# `uvicorn main:app --reload --port 8000`
# Donc on utilise des imports "absolus" relatifs au dossier backend (pas d'imports relatifs de package).
from config import CORS_ORIGINS
from database import Base, engine
from routes.agents_routes import router as agents_router
from routes.game_routes import router as game_router
from routes.stats_routes import router as stats_router
from routes.training_routes import router as training_router
from routes.agent_routes import router as agent_router
from websocket_handler import GameWebSocketManager

# Création des tables en base de données au démarrage
Base.metadata.create_all(bind=engine, checkfirst=True)

app = FastAPI(title="Snake AI Backend", version="1.0.0", default_response_class=ORJSONResponse)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routeurs REST
app.include_router(game_router)
app.include_router(agents_router)
app.include_router(stats_router)
app.include_router(training_router)
app.include_router(agent_router)


@app.get("/api/health")
def health_check() -> dict:
    """Route simple pour vérifier que le backend fonctionne."""
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Endpoint WebSocket principal."""
    manager = GameWebSocketManager()
    await manager.handle(websocket)

