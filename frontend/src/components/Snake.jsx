import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

const CELL_SIZE = 24;

function Snake() {
  const canvasRef  = useRef(null);
  const flashRef   = useRef(null);
  const prevScore  = useRef(0);
  const prevGameOver = useRef(false);

  const { snake, food, obstacles, gridSize, score, gameOver } = useSelector(
    (state) => state.game
  );

  const [flashClass, setFlashClass] = useState("");

  // Sync score ref
  useEffect(() => {
    prevScore.current = score;
  }, [score]);

  useEffect(() => {
    if (gameOver && !prevGameOver.current) {
      setFlashClass("flash-red");
      const t = setTimeout(() => setFlashClass(""), 700);
    }
    prevGameOver.current = gameOver;
  }, [gameOver]);

  // Rendu canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = gridSize * CELL_SIZE;
    canvas.width  = size;
    canvas.height = size;

    // Fond
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, size, size);

    // Grille légère
    ctx.strokeStyle = "rgba(148,163,184,0.04)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(size, i * CELL_SIZE);
      ctx.stroke();
    }

    // Obstacles
    obstacles.forEach(({ x, y }) => {
      const gx = x * CELL_SIZE;
      const gy = y * CELL_SIZE;
      ctx.fillStyle = "#374151";
      ctx.fillRect(gx + 1, gy + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      // Bordure claire
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 1;
      ctx.strokeRect(gx + 1.5, gy + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
    });

    // Nourriture (cercle rouge avec glow)
    if (food) {
      const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
      const fy = food.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.save();
      ctx.shadowBlur  = 18;
      ctx.shadowColor = "#f87171";
      ctx.fillStyle   = "#ef4444";
      ctx.beginPath();
      ctx.arc(fx, fy, CELL_SIZE / 2.8, 0, Math.PI * 2);
      ctx.fill();
      // Reflet
      ctx.shadowBlur = 0;
      ctx.fillStyle  = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.arc(fx - 2, fy - 2, CELL_SIZE / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Serpent avec effet de traînée (opacité décroissante)
    const total = snake.length;
    snake.forEach(({ x, y }, index) => {
      const isHead = index === 0;
      const ratio  = 1 - (index / Math.max(total, 1)) * 0.65; // 1.0 → 0.35
      const gx     = x * CELL_SIZE;
      const gy     = y * CELL_SIZE;
      const pad    = isHead ? 1 : 2;
      const r      = 3; // coin arrondi

      ctx.save();
      ctx.globalAlpha = ratio;

      if (isHead) {
        // Tête : glow vert
        ctx.shadowBlur  = 12;
        ctx.shadowColor = "#4ade80";
      }

      const gradient = ctx.createLinearGradient(gx, gy, gx + CELL_SIZE, gy + CELL_SIZE);
      gradient.addColorStop(0, isHead ? "#bbf7d0" : "#22c55e");
      gradient.addColorStop(1, isHead ? "#4ade80" : "#166534");
      ctx.fillStyle = gradient;

      // Rectangle arrondi
      ctx.beginPath();
      ctx.moveTo(gx + pad + r, gy + pad);
      ctx.lineTo(gx + CELL_SIZE - pad - r, gy + pad);
      ctx.quadraticCurveTo(gx + CELL_SIZE - pad, gy + pad, gx + CELL_SIZE - pad, gy + pad + r);
      ctx.lineTo(gx + CELL_SIZE - pad, gy + CELL_SIZE - pad - r);
      ctx.quadraticCurveTo(gx + CELL_SIZE - pad, gy + CELL_SIZE - pad, gx + CELL_SIZE - pad - r, gy + CELL_SIZE - pad);
      ctx.lineTo(gx + pad + r, gy + CELL_SIZE - pad);
      ctx.quadraticCurveTo(gx + pad, gy + CELL_SIZE - pad, gx + pad, gy + CELL_SIZE - pad - r);
      ctx.lineTo(gx + pad, gy + pad + r);
      ctx.quadraticCurveTo(gx + pad, gy + pad, gx + pad + r, gy + pad);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });

    // Overlay game over : teinte rouge sur la grille
    if (gameOver) {
      ctx.fillStyle = "rgba(239,68,68,0.08)";
      ctx.fillRect(0, 0, size, size);
    }
  }, [snake, food, obstacles, gridSize, gameOver]);

  const sizePx = gridSize * CELL_SIZE;

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={sizePx}
        height={sizePx}
        className="mx-auto rounded-lg border border-slate-800 bg-slate-950 block"
      />
      {/* Flash overlay */}
      {flashClass && (
        <div
          ref={flashRef}
          key={flashClass + Date.now()}
          className="absolute inset-0 rounded-lg pointer-events-none bg-red-500 flash-red"
        />
      )}
    </div>
  );
}

export default Snake;
