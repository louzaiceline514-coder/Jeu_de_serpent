"""Modèle ORM pour représenter un agent (humain ou IA)."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from database import Base


class Agent(Base):
    """Agent jouant au Snake (humain, A* ou Q-Learning)."""

    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "human" | "astar" | "rl"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

