import React from "react";
import { useSelector } from "react-redux";

// Tableau de bord temps réel pour la partie en cours.

function Dashboard() {
  const { score, stepCount, mode, gameOver } = useSelector((state) => state.game);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 h-full">
      <h2 className="text-sm font-medium text-slate-200">Dashboard temps réel</h2>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-800/60 rounded-lg p-2">
          <p className="text-slate-400">Score actuel</p>
          <p className="text-lg font-semibold text-emerald-400">{score}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2">
          <p className="text-slate-400">Nombre de steps</p>
          <p className="text-lg font-semibold text-sky-400">{stepCount}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2">
          <p className="text-slate-400">Mode</p>
          <p className="text-sm font-medium text-slate-100">{mode}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-2">
          <p className="text-slate-400">État</p>
          <p
            className={`text-sm font-medium ${
              gameOver ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {gameOver ? "Terminé" : "En cours"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
