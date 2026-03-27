"""Configuration de la base de données SQLAlchemy."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config import DB_URL

# Création de l'engine SQLite
engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False},
)

# Session locale pour les requêtes
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe de base pour les modèles ORM
Base = declarative_base()


def get_db():
    """Dépendance FastAPI pour obtenir une session de base de données."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations() -> None:
    """Applique les migrations SQLite manquantes (colonnes ajoutées après création initiale).

    SQLAlchemy ``create_all(checkfirst=True)`` crée les tables mais n'ajoute
    pas les nouvelles colonnes sur un schéma existant. Cette fonction comble
    ce manque pour les ajouts de colonnes nullables.
    """
    with engine.connect() as conn:
        # Migration : colonne description sur la table agents (ajoutée v2)
        result = conn.execute(
            __import__("sqlalchemy").text("PRAGMA table_info(agents)")
        )
        colonnes = {row[1] for row in result}
        if "description" not in colonnes:
            conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE agents ADD COLUMN description VARCHAR"
                )
            )
            conn.commit()

