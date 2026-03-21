import React from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import Snake from "./Snake";
import { wsService } from "../services/websocket";
import { setMode } from "../store/gameSlice";

/* ── Overlay Game Over ───────────────────────────────── */
function GameOverOverlay({ score, mode, onRestart }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/80 backdrop-blur-sm z-10">
      <div className="animate-gameover text-center space-y-4 p-8 rounded-2xl border border-red-800/60 bg-slate-900/90 shadow-2xl">
        <p className="text-3xl font-bold text-red-400">Game Over</p>
        <p className="text-slate-300 text-sm">Score final</p>
        <p className="text-5xl font-black text-emerald-400">{score}</p>
        <button
          onClick={onRestart}
          className="mt-2 px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-colors"
        >
          Rejouer
        </button>
      </div>
    </div>
  );
}

/* ── GameGrid ─────────────────────────────────────────── */
function GameGrid() {
  const dispatch  = useDispatch();
  const { gameOver, score, mode } = useSelector((s) => s.game);

  const handleRestart = () => {
    wsService.send("reset", {});
    dispatch(setMode(mode));
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[70vh] gap-4">
      {/* Zone de jeu + overlay game over */}
      <div className="relative">
        <Snake />
        {gameOver && (
          <GameOverOverlay
            score={score}
            mode={mode}
            onRestart={handleRestart}
          />
        )}
      </div>

      <p className="text-xs text-slate-500">Mode manuel : flèches directionnelles</p>
    </div>
  );
}

export default GameGrid;
