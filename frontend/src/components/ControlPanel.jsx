import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setMode } from "../store/gameSlice";
import { wsService } from "../services/websocket";
import { api } from "../services/api";

// Panneau de contrôle des modes et de la partie.

function ControlPanel() {
  const dispatch = useDispatch();
  const { mode, score, gameOver, stepCount } = useSelector((state) => state.game);
  const { connected } = useSelector((state) => state.ws);
  const [paused, setPaused] = useState(true);
  const [speed, setSpeed] = useState(150);
  // Initialiser started depuis le stepCount Redux pour survivre à la navigation entre vues
  const [started, setStarted] = useState(() => stepCount > 0 || gameOver);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    api.get("/api/stats/comparison")
      .then((data) => setBestScore(data[mode]?.best_score || 0))
      .catch(() => {});
  }, [mode, gameOver]);

  const changeMode = (newMode) => {
    dispatch(setMode(newMode));
    wsService.send("set_mode", { mode: newMode });
    setPaused(true);
    setStarted(false);
  };

  const handleStart = () => {
    if (started && !paused) {
      // Partie en cours → reset puis relance
      wsService.send("reset", {});
    }
    wsService.send("start", {});
    setPaused(false);
    setStarted(true);
  };

  const handleReset = () => {
    wsService.send("reset", {});
    setPaused(true);
    setStarted(false);
  };

  const handlePauseToggle = () => {
    const next = !paused;
    setPaused(next);
    wsService.send("set_paused", { paused: next });
  };

  const handleSpeedChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) return;
    setSpeed(value);
    wsService.send("set_speed", { speed: value });
  };

  // Charte graphique : couleur active selon le mode
  const modeColor = {
    manual:  "bg-emerald-500 text-white border-emerald-400",   // Emerald = Joueur
    astar:   "bg-blue-500 text-white border-blue-400",          // Blue    = A*
    rl:      "bg-violet-500 text-white border-violet-400",      // Violet  = RL
    random:  "bg-amber-500 text-white border-amber-400",        // Amber   = Aléatoire
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-100">Contrôles</span>
        <span
          className={`text-xs px-2 py-1 rounded-full font-mono ${
            connected ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
          }`}
        >
          {connected ? "Connecté" : "Déconnecté"}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-400 uppercase tracking-wide">Mode de jeu</p>
        <div className="flex gap-2">
          {[
            { key: "manual", label: "Manuel" },
            { key: "astar",  label: "A*" },
            { key: "rl",     label: "Q-Learning" }
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => changeMode(m.key)}
              className={`flex-1 px-2 py-1 text-xs rounded border font-medium ${
                mode === m.key
                  ? modeColor[m.key]
                  : "bg-slate-700 text-slate-300 border-slate-600 hover:border-slate-500"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-200">
        {/* Charte : font-mono pour les stats */}
        <span className="font-mono">Score : <span className="text-emerald-400 font-semibold">{score}</span></span>
        <span className="text-xs font-mono text-amber-400">Best : {bestScore}</span>
        {gameOver && <span className="text-red-400 text-xs font-medium">Game Over</span>}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={handleStart}
            className="flex-1 px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-sm text-white font-semibold border border-emerald-400"
          >
            {!started ? "Start" : paused ? "Reprendre" : "Redémarrer"}
          </button>
          <button
            onClick={handleReset}
            className="flex-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sm text-slate-100 border border-slate-700"
          >
            Reset
          </button>
          <button
            onClick={handlePauseToggle}
            disabled={gameOver}
            className="flex-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sm text-slate-100 border border-slate-700 disabled:opacity-50"
          >
            {paused ? "Reprendre" : "Pause"}
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Vitesse</span>
            <span>{speed} ms / tick</span>
          </div>
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={speed}
            onChange={handleSpeedChange}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
