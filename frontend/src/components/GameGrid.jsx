import React from "react";
import Snake from "./Snake";

// Conteneur visuel pour le canvas du jeu.

function GameGrid() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <Snake />
      <p className="text-xs text-slate-400">
        Contrôles clavier en mode manuel : flèches directionnelles.
      </p>
    </div>
  );
}

export default GameGrid;

