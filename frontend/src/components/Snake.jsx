import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

function drawFood(ctx, x, y, cellSize) {
  const centerX = x * cellSize + cellSize / 2;
  const centerY = y * cellSize + cellSize / 2;

  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#fb7185";

  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(centerX, centerY + 1, cellSize * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f87171";
  ctx.beginPath();
  ctx.arc(centerX - cellSize * 0.08, centerY - cellSize * 0.02, cellSize * 0.11, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - cellSize * 0.16);
  ctx.quadraticCurveTo(centerX + cellSize * 0.1, centerY - cellSize * 0.34, centerX + cellSize * 0.2, centerY - cellSize * 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawSegment(ctx, x, y, cellSize, isHead) {
  const left = x * cellSize + 2;
  const top = y * cellSize + 2;
  const size = cellSize - 4;
  const radius = Math.max(6, cellSize * 0.24);

  const gradient = ctx.createLinearGradient(left, top, left + size, top + size);
  gradient.addColorStop(0, isHead ? "#fef08a" : "#86efac");
  gradient.addColorStop(0.55, isHead ? "#34d399" : "#22c55e");
  gradient.addColorStop(1, "#166534");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(left, top, size, size, radius);
  ctx.fill();

  ctx.strokeStyle = isHead ? "#fefce8" : "#14532d";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (!isHead) {
    return;
  }

  const eyeRadius = Math.max(2, cellSize * 0.07);
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(left + size * 0.34, top + size * 0.36, eyeRadius, 0, Math.PI * 2);
  ctx.arc(left + size * 0.66, top + size * 0.36, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
}

function Snake({ availableWidth = 500, availableHeight = 500 }) {
  const bgCanvasRef = useRef(null);
  const entityCanvasRef = useRef(null);
  const { snake, food, obstacles, dynamicObstacles, gridSize, mode, astarPath, rlPath } = useSelector((state) => state.game);

  const cellSize = Math.max(10, Math.floor(Math.min(availableWidth, availableHeight) / (gridSize || 25)));

  // FPS counter — ne ralentit pas le rendu, calcul purement temporel
  const fpsRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);

  // Couche 1 : fond + grille + obstacles statiques (se redessine rarement)
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const size = gridSize * cellSize;
    canvas.width = size;
    canvas.height = size;

    const background = ctx.createLinearGradient(0, 0, size, size);
    background.addColorStop(0, "#020617");
    background.addColorStop(0.5, "#0b1328");
    background.addColorStop(1, "#020617");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.10)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(size, i * cellSize);
      ctx.stroke();
    }

    obstacles.forEach(({ x, y }) => {
      const left = x * cellSize + 2;
      const top = y * cellSize + 2;
      const sizePx = cellSize - 4;
      const gradient = ctx.createLinearGradient(left, top, left + sizePx, top + sizePx);
      gradient.addColorStop(0, "#334155");
      gradient.addColorStop(1, "#0f172a");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(left, top, sizePx, sizePx, Math.max(5, cellSize * 0.18));
      ctx.fill();
    });
  }, [gridSize, obstacles, mode, cellSize]);

  // Couche 2 : obstacles dynamiques + nourriture + serpent + chemin A* + FPS
  useEffect(() => {
    const canvas = entityCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const size = gridSize * cellSize;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // --- Overlay chemin A* — bleu #3B82F6 (charte : accent primaire A*) ---
    if (mode === "astar" && astarPath && astarPath.length > 0) {
      astarPath.forEach(({ x, y }, index) => {
        const alpha = 0.45 - (index / astarPath.length) * 0.35; // fondu progressif
        ctx.fillStyle = `rgba(59, 130, 246, ${alpha.toFixed(2)})`; // bleu Blue-500 charte
        const pad = Math.floor(cellSize * 0.22);
        ctx.beginPath();
        ctx.roundRect(
          x * cellSize + pad,
          y * cellSize + pad,
          cellSize - pad * 2,
          cellSize - pad * 2,
          Math.max(3, cellSize * 0.16),
        );
        ctx.fill();
      });
    }

    // --- Overlay chemin Q-Learning — violet #8B5CF6 (charte : accent secondaire RL) ---
    if (mode === "rl" && rlPath && rlPath.length > 0) {
      rlPath.forEach(({ x, y }, index) => {
        const alpha = 0.45 - (index / rlPath.length) * 0.35; // fondu progressif (identique à A*)
        ctx.fillStyle = `rgba(139, 92, 246, ${alpha.toFixed(2)})`; // violet Violet-500 charte
        const pad = Math.floor(cellSize * 0.22);
        ctx.beginPath();
        ctx.roundRect(
          x * cellSize + pad,
          y * cellSize + pad,
          cellSize - pad * 2,
          cellSize - pad * 2,
          Math.max(3, cellSize * 0.16),
        );
        ctx.fill();
      });
    }

    dynamicObstacles.forEach(({ x, y }) => {
      const left = x * cellSize + 3;
      const top = y * cellSize + 3;
      const sizePx = cellSize - 6;
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.roundRect(left, top, sizePx, sizePx, Math.max(4, cellSize * 0.14));
      ctx.fill();
    });

    if (food) {
      drawFood(ctx, food.x, food.y, cellSize);
    }

    snake.forEach(({ x, y }, index) => {
      drawSegment(ctx, x, y, cellSize, index === 0);
    });

    // --- Compteur FPS (coin supérieur droit) ---
    frameCountRef.current += 1;
    const now = Date.now();
    const elapsed = now - lastFrameTimeRef.current;
    if (elapsed >= 1000) {
      fpsRef.current = Math.round((frameCountRef.current * 1000) / elapsed);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
    const fps = fpsRef.current;
    ctx.save();
    ctx.font = `bold ${Math.max(10, cellSize * 0.45)}px monospace`;
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(148, 163, 184, 0.70)";
    ctx.fillText(`${fps} FPS`, size - 6, Math.max(14, cellSize * 0.55));
    ctx.restore();

  }, [snake, food, dynamicObstacles, gridSize, mode, astarPath, rlPath, cellSize]);

  const sizePx = gridSize * cellSize;

  return (
    <div className="flex items-center justify-center">
    <div
      className="relative rounded-[2rem] border border-slate-700/80 shadow-[0_24px_70px_rgba(15,23,42,0.55)]"
      style={{ width: sizePx, height: sizePx }}
    >
      <canvas
        ref={bgCanvasRef}
        width={sizePx}
        height={sizePx}
        className="absolute top-0 left-0 rounded-[2rem] bg-slate-950"
      />
      <canvas
        ref={entityCanvasRef}
        width={sizePx}
        height={sizePx}
        className="absolute top-0 left-0 rounded-[2rem]"
      />
    </div>
    </div>
  );
}

export default Snake;
