import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

const CELL_SIZE_MANUAL = 30;
const CELL_SIZE_AI = 30;

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

function Snake() {
  const bgCanvasRef = useRef(null);
  const entityCanvasRef = useRef(null);
  const { snake, food, obstacles, dynamicObstacles, gridSize, mode } = useSelector((state) => state.game);

  // Couche 1 : fond + grille + obstacles statiques (se redessine rarement)
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    const cellSize = mode === "manual" ? CELL_SIZE_MANUAL : CELL_SIZE_AI;
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
  }, [gridSize, obstacles, mode]);

  // Couche 2 : obstacles dynamiques + nourriture + serpent (se redessine à chaque tick)
  useEffect(() => {
    const canvas = entityCanvasRef.current;
    if (!canvas) return;

    const cellSize = mode === "manual" ? CELL_SIZE_MANUAL : CELL_SIZE_AI;
    const ctx = canvas.getContext("2d");
    const size = gridSize * cellSize;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

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
  }, [snake, food, dynamicObstacles, gridSize, mode]);

  const cellSize = mode === "manual" ? CELL_SIZE_MANUAL : CELL_SIZE_AI;
  const sizePx = gridSize * cellSize;

  return (
    <div
      className="relative mx-auto rounded-[2rem] border border-slate-700/80 shadow-[0_24px_70px_rgba(15,23,42,0.55)]"
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
  );
}

export default Snake;
