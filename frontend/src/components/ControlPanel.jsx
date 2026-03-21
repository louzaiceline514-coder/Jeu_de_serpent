import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setMode } from "../store/gameSlice";
import { wsService } from "../services/websocket";

// Panneau de contrôle des modes et de la partie.

function ControlPanel() {
  const dispatch = useDispatch();
  const { mode, score, gameOver } = useSelector((state) => state.game);
  const { connected } = useSelector((state) => state.ws);
  const [paused, setPaused] = useState(true);
  const [speed, setSpeed] = useState(150);
  const [started, setStarted] = useState(false);

  const changeMode = (newMode) => {
    dispatch(setMode(newMode));
    wsService.send("set_mode", { mode: newMode });
    setPaused(true);
    setStarted(false);
  };

  const handleStart = () => {
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
    const value = parseInt(e.target.value, 10) || 150;
    setSpeed(value);
    wsService.send("set_speed", { speed: value });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-200">Contrôles</span>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            connected ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
          }`}
        >
          {connected ? "Connecté au backend" : "Déconnecté"}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-400">Mode de jeu</p>
        <div className="flex gap-2">
          {[
            { key: "manual", label: "Manuel" },
            { key: "astar", label: "A*" },
            { key: "rl", label: "Q-Learning" }
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => changeMode(m.key)}
              className={`flex-1 px-2 py-1 text-xs rounded border ${
                mode === m.key
                  ? "bg-emerald-500 text-slate-900 border-emerald-400"
                  : "bg-slate-800 text-slate-200 border-slate-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-200">
        <span>Score : {score}</span>
        {gameOver && <span className="text-red-400 text-xs">Game Over</span>}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={handleStart}
            className="flex-1 px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-sm text-slate-950 font-semibold border border-emerald-300"
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
            disabled={!started}
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
