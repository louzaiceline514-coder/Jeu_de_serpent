import React from "react";
import Snake from "./Snake";

// Conteneur visuel pour le canvas du jeu.

function GameGrid() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[72vh] space-y-4">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Aire de jeu</p>
      <Snake />
    </div>
  );
}

export default GameGrid;
