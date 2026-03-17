import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

// Composant responsable du rendu du Snake dans un canvas.

const CELL_SIZE = 24;

function Snake() {
  const canvasRef = useRef(null);
  const { snake, food, obstacles, gridSize } = useSelector((state) => state.game);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = gridSize * CELL_SIZE;
    canvas.width = size;
    canvas.height = size;

    // Fond
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, size, size);

    // Obstacles
    ctx.fillStyle = "#4b5563";
    obstacles.forEach(({ x, y }) => {
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    // Nourriture (rouge avec glow)
    if (food) {
      const fx = food.x * CELL_SIZE + CELL_SIZE / 2;
      const fy = food.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#f97373";
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(fx, fy, CELL_SIZE / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Serpent (vert avec tête plus claire)
    snake.forEach(({ x, y }, index) => {
      const isHead = index === 0;
      const gx = x * CELL_SIZE;
      const gy = y * CELL_SIZE;
      const gradient = ctx.createLinearGradient(gx, gy, gx + CELL_SIZE, gy + CELL_SIZE);
      gradient.addColorStop(0, isHead ? "#bbf7d0" : "#22c55e");
      gradient.addColorStop(1, "#166534");
      ctx.fillStyle = gradient;
      ctx.fillRect(gx + 2, gy + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    });
  }, [snake, food, obstacles, gridSize]);

  const sizePx = gridSize * CELL_SIZE;

  return (
    <canvas
      ref={canvasRef}
      width={sizePx}
      height={sizePx}
      className="mx-auto rounded-lg border border-slate-800 bg-slate-950"
    />
  );
}

export default Snake;

