import React, { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../services/api";

const CELL_SIZE = 16;

function drawFrame(canvas, frame) {
  if (!canvas || !frame) return;
  const gridSize = frame.taille_grille
    ? parseInt(frame.taille_grille.split("x")[0], 10)
    : 25;
  const size = gridSize * CELL_SIZE;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(148,163,184,0.08)";
  for (let i = 0; i <= gridSize; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL_SIZE, 0); ctx.lineTo(i * CELL_SIZE, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL_SIZE); ctx.lineTo(size, i * CELL_SIZE); ctx.stroke();
  }

  (frame.obstacles ?? []).forEach(({ x, y }) => {
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.roundRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2, 3);
    ctx.fill();
  });

  (frame.dynamic_obstacles ?? []).forEach(({ x, y }) => {
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.roundRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4, 3);
    ctx.fill();
  });

  if (frame.food) {
    const cx = frame.food.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = frame.food.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ef4444";
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(cx, cy, CELL_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  (frame.snake ?? []).forEach(({ x, y }, index) => {
    const gradient = ctx.createLinearGradient(
      x * CELL_SIZE, y * CELL_SIZE,
      x * CELL_SIZE + CELL_SIZE, y * CELL_SIZE + CELL_SIZE
    );
    gradient.addColorStop(0, index === 0 ? "#fef08a" : "#86efac");
    gradient.addColorStop(1, "#166534");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x * CELL_SIZE + 1.5, y * CELL_SIZE + 1.5, CELL_SIZE - 3, CELL_SIZE - 3, 4);
    ctx.fill();
  });
}

function ReplayViewer({ gameId, onClose }) {
  const [frames, setFrames] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(150);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gameInfo, setGameInfo] = useState(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/stats/replay/${gameId}`)
      .then((data) => {
        if (data.frames && data.frames.length > 0) {
          setFrames(data.frames);
          setGameInfo({ score: data.score, nb_steps: data.nb_steps });
          setCurrentIndex(0);
        } else {
          setError("Aucune frame disponible pour cette partie (partie jouée avant l'enregistrement du replay).");
        }
      })
      .catch(() => setError("Impossible de charger le replay."))
      .finally(() => setLoading(false));
  }, [gameId]);

  useEffect(() => {
    drawFrame(canvasRef.current, frames[currentIndex]);
  }, [frames, currentIndex]);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (frames.length === 0) return;
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= frames.length - 1) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
  }, [frames.length, speed]);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleSeek = (e) => {
    stop();
    setCurrentIndex(Number(e.target.value));
  };

  const handleRestart = () => {
    stop();
    setCurrentIndex(0);
  };

  const currentFrame = frames[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Replay — Partie #{gameId}</h2>
            {gameInfo && (
              <p className="text-xs text-slate-400 mt-1">
                Score final : {gameInfo.score} · {gameInfo.nb_steps} steps · {frames.length} frames enregistrées
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl font-bold">×</button>
        </div>

        {loading && <p className="text-slate-400 text-center py-8">Chargement du replay…</p>}
        {error && <p className="text-rose-400 text-center py-8">{error}</p>}

        {!loading && !error && frames.length > 0 && (
          <>
            <div className="flex justify-center overflow-auto">
              <canvas ref={canvasRef} className="rounded-lg border border-slate-700" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Frame {currentIndex + 1}/{frames.length}</span>
                {currentFrame && <span>· Score : {currentFrame.score ?? 0}</span>}
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(0, frames.length - 1)}
                value={currentIndex}
                onChange={handleSeek}
                className="w-full accent-emerald-400"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRestart}
                  className="px-3 py-1.5 rounded bg-slate-700 text-slate-200 text-sm hover:bg-slate-600"
                >
                  ⏮
                </button>
                {isPlaying ? (
                  <button
                    onClick={stop}
                    className="px-4 py-1.5 rounded bg-amber-500 text-slate-950 text-sm font-semibold"
                  >
                    ⏸ Pause
                  </button>
                ) : (
                  <button
                    onClick={play}
                    disabled={currentIndex >= frames.length - 1}
                    className="px-4 py-1.5 rounded bg-emerald-500 text-slate-950 text-sm font-semibold disabled:opacity-50"
                  >
                    ▶ Lire
                  </button>
                )}
                <button
                  onClick={() => { stop(); setCurrentIndex(frames.length - 1); }}
                  className="px-3 py-1.5 rounded bg-slate-700 text-slate-200 text-sm hover:bg-slate-600"
                >
                  ⏭
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-slate-400">Vitesse</span>
                  <select
                    value={speed}
                    onChange={(e) => { stop(); setSpeed(Number(e.target.value)); }}
                    className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1"
                  >
                    <option value={300}>Lente</option>
                    <option value={150}>Normale</option>
                    <option value={80}>Rapide</option>
                    <option value={30}>Très rapide</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReplayViewer;
