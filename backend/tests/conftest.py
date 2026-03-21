"""Configuration pytest : ajoute le dossier backend au path."""
import sys
import os

# Permet aux tests d'importer les modules backend sans package install
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
