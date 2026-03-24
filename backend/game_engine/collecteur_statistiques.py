"""Collecte et agrège les statistiques de parties Snake."""

from __future__ import annotations

from statistics import mean, median
from typing import List


class CollecteurStatistiques:
    """Agrège les statistiques produites pendant une ou plusieurs parties.

    Correspond à la classe CollecteurStatistiques du diagramme de classes
    du rapport de conception.
    """

    def __init__(self) -> None:
        self.scores: List[int] = []
        self.steps: List[int] = []
        self.longueurs: List[int] = []
        self.causes_mort: List[str] = []

    def enregistrer_partie(
        self,
        score: int,
        steps: int,
        longueur: int,
        cause_mort: str,
    ) -> None:
        """Enregistre les résultats d'une partie terminée."""
        self.scores.append(score)
        self.steps.append(steps)
        self.longueurs.append(longueur)
        self.causes_mort.append(cause_mort)

    def reinitialiser(self) -> None:
        """Vide toutes les données collectées."""
        self.scores.clear()
        self.steps.clear()
        self.longueurs.clear()
        self.causes_mort.clear()

    @property
    def nb_parties(self) -> int:
        return len(self.scores)

    @property
    def score_moyen(self) -> float:
        return mean(self.scores) if self.scores else 0.0

    @property
    def score_median(self) -> float:
        return float(median(self.scores)) if self.scores else 0.0

    @property
    def meilleur_score(self) -> int:
        return max(self.scores) if self.scores else 0

    @property
    def taux_survie(self) -> float:
        """Proportion de parties avec score > 0 (serpent a mangé au moins une fois)."""
        if not self.scores:
            return 0.0
        return sum(1 for s in self.scores if s > 0) / self.nb_parties

    def to_dict(self) -> dict:
        """Sérialise les statistiques sous forme de dictionnaire."""
        return {
            "nb_parties": self.nb_parties,
            "score_moyen": round(self.score_moyen, 2),
            "score_median": round(self.score_median, 2),
            "meilleur_score": self.meilleur_score,
            "taux_survie": round(self.taux_survie, 3),
        }
