"""Modèle ORM pour l'historique d'entraînement de l'agent Q-Learning."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer
from database import Base


class RLTraining(Base):
    """Enregistre les métriques de chaque épisode d'entraînement RL."""

    __tablename__ = "rl_training"

    id = Column(Integer, primary_key=True, index=True)
    episode = Column(Integer, nullable=False)
    recompense_totale = Column(Float, nullable=False)    # récompense cumulée de l'épisode
    epsilon = Column(Float, nullable=False)              # taux d'exploration en fin d'épisode
    perte_moyenne = Column(Float, nullable=False)        # erreur TD moyenne (0 pour Q-table pure)
    score_final = Column(Integer, nullable=False)        # score obtenu à la fin de l'épisode
    taux_apprentissage = Column(Float, nullable=False)   # alpha utilisé
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
