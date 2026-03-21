import React from "react";
import { useSelector } from "react-redux";
import Snake from "./Snake";

// Conteneur visuel pour le canvas du jeu.

function GameGrid() {
  const { mode } = useSelector((state) => state.game);
  const manualMode = mode === "manual";

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[72vh] space-y-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Aire de jeu</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          {manualMode ? "Vue agrandie pour le mode manuel" : "Vue standard pour les algorithmes"}
        </h2>
      </div>
      <Snake />
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-center">
        <p className="text-xs text-slate-400">
          Contrôles clavier en mode manuel : flèches directionnelles.
        </p>
      </div>
    </div>
  );
}

export default GameGrid;
