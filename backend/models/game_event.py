"""Modèle ORM pour les événements survenus durant une partie."""

from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class GameEvent(Base):
    """Trace un événement (déplacement, collision, nourriture) pendant une partie."""

    __tablename__ = "game_events"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    type_evenement = Column(String(50), nullable=False)  # "move" | "food" | "collision"
    details_json = Column(Text, nullable=True)            # données JSON libres
    timestamp = Column(Float, nullable=False)             # secondes depuis le début de la partie
    score = Column(Integer, nullable=True)                # score au moment de l'événement
    direction = Column(String(10), nullable=True)         # direction du serpent

    game = relationship("Game", backref="events")
