"""Modèle ORM pour les statistiques agrégées des agents."""

from sqlalchemy import Column, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship

from database import Base


class AgentStats(Base):
    """Statistiques globales d'un agent sur plusieurs parties."""

    __tablename__ = "agent_stats"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False, unique=True)
    games_played = Column(Integer, default=0, nullable=False)
    avg_score = Column(Float, default=0.0, nullable=False)
    best_score = Column(Integer, default=0, nullable=False)
    win_rate = Column(Float, default=0.0, nullable=False)  # taux de survie / réussite

    agent = relationship("Agent", backref="stats")

