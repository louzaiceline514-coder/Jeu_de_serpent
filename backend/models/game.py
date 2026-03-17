"""Modèle ORM pour représenter une partie de Snake."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship

from database import Base


class Game(Base):
    """Partie jouée par un agent donné."""

    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    score = Column(Integer, nullable=False)
    nb_steps = Column(Integer, nullable=False)
    duration = Column(Float, nullable=False)  # durée en secondes
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    agent = relationship("Agent", backref="games")

