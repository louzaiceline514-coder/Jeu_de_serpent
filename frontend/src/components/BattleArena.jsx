import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { api } from "../services/api";

const GRID_SIZE = 25;
const CELL_SIZE = 16;
const TICK_DELAY_MS = 140;
const MAX_STEPS = 1200;

const createInitialGameState = () => ({
  snake: [{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }],
  food: null,
  obstacles: [],
  dynamic_obstacles: [],
  score: 0,
  game_over: false,
  step_count: 0,
  mode: "battle",
  direction: "DROITE",
  growth_pending: false
});

const createInitialLiveStats = (agentType) => ({
  agentType,
  inferenceMs: 0,
  avgInferenceMs: 0,
  epsilon: agentType === "rl" ? 0 : null,
  safetyScore: 0,
  analysis: "En attente",
  samples: 0
});

const cloneState = (state) => ({
  snake: state.snake.map((s) => ({ ...s })),
  food: state.food ? { ...state.food } : null,
  obstacles: state.obstacles.map((o) => ({ ...o })),
  dynamic_obstacles: (state.dynamic_obstacles ?? []).map((o) => ({ ...o })),
  score: state.score,
  game_over: state.game_over,
  step_count: state.step_count,
  mode: state.mode,
  direction: state.direction,
  growth_pending: state.growth_pending ?? false
});

const normalizeState = (payload) => ({
  snake: payload?.snake ?? [],
  food: payload?.food ?? null,
  obstacles: payload?.obstacles ?? [],
  dynamic_obstacles: payload?.dynamic_obstacles ?? [],
  score: payload?.score ?? 0,
  game_over: payload?.game_over ?? payload?.gameOver ?? false,
  step_count: payload?.step_count ?? payload?.stepCount ?? 0,
  mode: payload?.mode ?? "battle",
  direction: payload?.direction ?? "DROITE",
  growth_pending: payload?.growth_pending ?? payload?.growthPending ?? false
});

const stepsPerFood = (g) => (!g.score ? 0 : g.step_count / g.score);

const scoreMetric = (value, lowerIsBetter = false) => {
  const clamped = Math.max(0, Math.min(100, value));
  return lowerIsBetter ? 100 - clamped : clamped;
};

// ── Heatmap helpers ─────────────────────────────────────────────
const createHeatmap = () => Array.from({ length: GRID_SIZE }, () => new Array(GRID_SIZE).fill(0));

const recordPosition = (heatmap, snake) => {
  if (!snake || !snake.length) return;
  const { x, y } = snake[0];
  if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
    heatmap[y][x] += 1;
  }
};

const drawHeatmap = (canvas, heatmaps, labels, colors) => {
  if (!canvas) return;
  const size = GRID_SIZE * CELL_SIZE;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, size, size);

  // Find max value across all heatmaps
  let maxVal = 1;
  heatmaps.forEach((hm) => hm.forEach((row) => row.forEach((v) => { if (v > maxVal) maxVal = v; })));

  // Composite: blend all agents
  const composite = createHeatmap();
  heatmaps.forEach((hm, agentIdx) => {
    hm.forEach((row, y) => row.forEach((v, x) => {
      if (v > composite[y][x]) composite[y][x] = v;
    }));
  });

  // Draw heatmap cells
  composite.forEach((row, y) => row.forEach((v, x) => {
    if (v === 0) return;
    const intensity = v / maxVal;
    const r = Math.round(intensity * 239);
    const g = Math.round((1 - intensity) * 68 + intensity * 68);
    const b = Math.round((1 - intensity) * 130);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.2 + intensity * 0.75})`;
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }));

  // Grid overlay
  ctx.strokeStyle = "rgba(148,163,184,0.06)";
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL_SIZE, 0); ctx.lineTo(i * CELL_SIZE, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL_SIZE); ctx.lineTo(size, i * CELL_SIZE); ctx.stroke();
  }

  // Legend
  ctx.setLineDash([]);
  labels.forEach((label, i) => {
    ctx.fillStyle = colors[i];
    ctx.fillRect(8, 8 + i * 18, 12, 12);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "11px sans-serif";
    ctx.fillText(label, 26, 18 + i * 18);
  });
};

// ── Canvas renderer ──────────────────────────────────────────────
const drawGrid = (canvas, gameState, snakeColor, foodColor) => {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const size = GRID_SIZE * CELL_SIZE;
  canvas.width = size;
  canvas.height = size;

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, "#020617");
  bg.addColorStop(0.55, "#0b1328");
  bg.addColorStop(1, "#020617");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(148,163,184,0.08)";
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL_SIZE, 0); ctx.lineTo(i * CELL_SIZE, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL_SIZE); ctx.lineTo(size, i * CELL_SIZE); ctx.stroke();
  }

  gameState.obstacles.forEach(({ x, y }) => {
    const gradient = ctx.createLinearGradient(x * CELL_SIZE, y * CELL_SIZE, x * CELL_SIZE + CELL_SIZE, y * CELL_SIZE + CELL_SIZE);
    gradient.addColorStop(0, "#475569");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4, 3);
    ctx.fill();
  });

  ctx.fillStyle = "#64748b";
  gameState.dynamic_obstacles.forEach(({ x, y }) => {
    ctx.beginPath();
    ctx.roundRect(x * CELL_SIZE + 3, y * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6, 3);
    ctx.fill();
  });

  if (gameState.food) {
    const cx = gameState.food.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = gameState.food.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = foodColor;
    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(cx, cy + 1, CELL_SIZE / 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  gameState.snake.forEach(({ x, y }, index) => {
    const gradient = ctx.createLinearGradient(x * CELL_SIZE, y * CELL_SIZE, x * CELL_SIZE + CELL_SIZE, y * CELL_SIZE + CELL_SIZE);
    gradient.addColorStop(0, index === 0 ? "#fef08a" : `${snakeColor}cc`);
    gradient.addColorStop(1, snakeColor);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x * CELL_SIZE + 1.5, y * CELL_SIZE + 1.5, CELL_SIZE - 3, CELL_SIZE - 3, 4);
    ctx.fill();
    if (index === 0) {
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(x * CELL_SIZE + 5, y * CELL_SIZE + 5, 1.2, 0, Math.PI * 2);
      ctx.arc(x * CELL_SIZE + 10, y * CELL_SIZE + 5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
};

// ── Sub-components ───────────────────────────────────────────────
const StatPill = memo(function StatPill({ label, value, accentClass }) {
  return (
    <div className="rounded-lg bg-slate-950/60 border border-slate-800 px-2 py-1.5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
});

const ArenaCard = memo(function ArenaCard({ title, badge, accentClass, accentBorderClass, canvasRef, gameState, liveStats }) {
  const safetyPercent = Math.round((liveStats.safetyScore ?? 0) * 100);
  return (
    <div className={`bg-slate-900/80 rounded-xl border ${accentBorderClass} p-3 space-y-3`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-base font-semibold ${accentClass}`}>{title}</h2>
          {badge && <span className="text-xs text-slate-500">{badge}</span>}
        </div>
        <span className={gameState.game_over ? "text-red-400 text-xs" : "text-emerald-400 text-xs"}>
          {gameState.game_over ? "Game Over" : "Live"}
        </span>
      </div>
      <div className="flex justify-center">
        <canvas ref={canvasRef} className="border border-slate-700 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatPill label="Score" value={gameState.score} accentClass={accentClass} />
        <StatPill label="Steps" value={gameState.step_count} accentClass={accentClass} />
        <StatPill label="Steps/Food" value={gameState.score ? stepsPerFood(gameState).toFixed(1) : "--"} accentClass={accentClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatPill label="Latence" value={`${liveStats.inferenceMs.toFixed(1)} ms`} accentClass={accentClass} />
        {liveStats.epsilon !== null
          ? <StatPill label="Exploration" value={liveStats.epsilon.toFixed(3)} accentClass={accentClass} />
          : <StatPill label="Sécurité" value={`${safetyPercent}%`} accentClass={accentClass} />}
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className={accentClass.includes("emerald") ? "h-full bg-emerald-400" : accentClass.includes("sky") ? "h-full bg-sky-400" : "h-full bg-amber-400"}
          style={{ width: `${safetyPercent}%` }} />
      </div>
    </div>
  );
});

// ── Main component ───────────────────────────────────────────────
function BattleArena() {
  const [astarGame, setAstarGame] = useState(createInitialGameState);
  const [rlGame, setRlGame] = useState(createInitialGameState);
  const [humanGame, setHumanGame] = useState(createInitialGameState);
  const [astarStats, setAstarStats] = useState(() => createInitialLiveStats("astar"));
  const [rlStats, setRlStats] = useState(() => createInitialLiveStats("rl"));
  const [humanStats, setHumanStats] = useState(() => createInitialLiveStats("manual"));
  const [battleHistory, setBattleHistory] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState("");
  const [showHeatmap, setShowHeatmap] = useState(false);

  const canvasAstarRef = useRef(null);
  const canvasRlRef = useRef(null);
  const canvasHumanRef = useRef(null);
  const canvasHeatmapRef = useRef(null);
  const loopCancelledRef = useRef(false);
  const pausedRef = useRef(false);
  const humanDirectionRef = useRef("DROITE");

  // Heatmap accumulators (refs so they don't trigger re-renders)
  const heatAstar = useRef(createHeatmap());
  const heatRl = useRef(createHeatmap());
  const heatHuman = useRef(createHeatmap());

  // Keyboard listener for human player
  useEffect(() => {
    const handleKey = (e) => {
      const map = { ArrowUp: "HAUT", ArrowDown: "BAS", ArrowLeft: "GAUCHE", ArrowRight: "DROITE" };
      if (map[e.key]) {
        e.preventDefault();
        humanDirectionRef.current = map[e.key];
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => { drawGrid(canvasAstarRef.current, astarGame, "#22c55e", "#ef4444"); }, [astarGame]);
  useEffect(() => { drawGrid(canvasRlRef.current, rlGame, "#38bdf8", "#f59e0b"); }, [rlGame]);
  useEffect(() => { drawGrid(canvasHumanRef.current, humanGame, "#f97316", "#a855f7"); }, [humanGame]);

  useEffect(() => {
    if (showHeatmap) {
      drawHeatmap(
        canvasHeatmapRef.current,
        [heatAstar.current, heatRl.current, heatHuman.current],
        ["A*", "Q-Learning", "Humain"],
        ["#22c55e", "#38bdf8", "#f97316"]
      );
    }
  }, [showHeatmap]);

  useEffect(() => { return () => { loopCancelledRef.current = true; }; }, []);
  useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);

  const barData = useMemo(() => [
    { label: "Score", astar: astarGame.score, rl: rlGame.score, human: humanGame.score },
    { label: "Steps", astar: astarGame.step_count, rl: rlGame.step_count, human: humanGame.step_count },
    { label: "Steps/Food", astar: +stepsPerFood(astarGame).toFixed(1), rl: +stepsPerFood(rlGame).toFixed(1), human: +stepsPerFood(humanGame).toFixed(1) },
    { label: "Latence (ms)", astar: +astarStats.avgInferenceMs.toFixed(2), rl: +rlStats.avgInferenceMs.toFixed(2), human: +humanStats.avgInferenceMs.toFixed(2) },
    { label: "Sécurité %", astar: Math.round((astarStats.safetyScore ?? 0) * 100), rl: Math.round((rlStats.safetyScore ?? 0) * 100), human: Math.round((humanStats.safetyScore ?? 0) * 100) }
  ], [astarGame, rlGame, humanGame, astarStats, rlStats, humanStats]);

  const radarData = useMemo(() => [
    { metric: "Vitesse", astar: scoreMetric((astarStats.avgInferenceMs / 12) * 100, true), rl: scoreMetric((rlStats.avgInferenceMs / 12) * 100, true), human: scoreMetric((humanStats.avgInferenceMs / 12) * 100, true) },
    { metric: "Précision", astar: astarGame.game_over ? 25 : 95, rl: rlGame.game_over ? 25 : 95, human: humanGame.game_over ? 25 : 95 },
    { metric: "Optimisation", astar: scoreMetric((stepsPerFood(astarGame) / 24) * 100, true), rl: scoreMetric((stepsPerFood(rlGame) / 24) * 100, true), human: scoreMetric((stepsPerFood(humanGame) / 24) * 100, true) },
    { metric: "Survie", astar: scoreMetric((astarGame.step_count / MAX_STEPS) * 100), rl: scoreMetric((rlGame.step_count / MAX_STEPS) * 100), human: scoreMetric((humanGame.step_count / MAX_STEPS) * 100) }
  ], [astarGame, rlGame, humanGame, astarStats, rlStats, humanStats]);

  const initBattleState = async () => {
    const response = await api.post("/api/agent/init", { mode: "battle" });
    return normalizeState(response.payload);
  };

  const stepAgent = async (agentType, gameState, forcedDirection = null) => {
    const body = { agent_type: agentType, game_state: gameState };
    if (forcedDirection) body.forced_direction = forcedDirection;
    const response = await api.post("/api/agent/step", body);
    return { state: normalizeState(response.payload), meta: response.meta ?? {} };
  };

  const startBattle = async () => {
    if (isRunning) return;
    setError("");
    setIsRunning(true);
    setIsPaused(false);
    setShowHeatmap(false);
    loopCancelledRef.current = false;
    heatAstar.current = createHeatmap();
    heatRl.current = createHeatmap();
    heatHuman.current = createHeatmap();
    humanDirectionRef.current = "DROITE";
    setAstarStats(createInitialLiveStats("astar"));
    setRlStats(createInitialLiveStats("rl"));
    setHumanStats(createInitialLiveStats("manual"));

    try {
      const baseState = await initBattleState();
      const roundNumber = currentRound + 1;
      setCurrentRound(roundNumber);
      setAstarGame(cloneState(baseState));
      setRlGame(cloneState(baseState));
      setHumanGame(cloneState(baseState));

      let nextAstar = cloneState(baseState);
      let nextRl = cloneState(baseState);
      let nextHuman = cloneState(baseState);
      let localAstarStats = createInitialLiveStats("astar");
      let localRlStats = createInitialLiveStats("rl");
      let localHumanStats = createInitialLiveStats("manual");
      let steps = 0;

      while (!loopCancelledRef.current && steps < MAX_STEPS) {
        if (pausedRef.current) {
          await new Promise((r) => window.setTimeout(r, 100));
          continue;
        }

        const promises = [];

        if (!nextAstar.game_over) {
          promises.push(stepAgent("astar", nextAstar).then((res) => {
            nextAstar = res.state;
            recordPosition(heatAstar.current, nextAstar.snake);
            localAstarStats = {
              ...localAstarStats, samples: localAstarStats.samples + 1,
              inferenceMs: res.meta.inference_ms ?? 0,
              avgInferenceMs: (localAstarStats.avgInferenceMs * localAstarStats.samples + (res.meta.inference_ms ?? 0)) / (localAstarStats.samples + 1),
              safetyScore: res.meta.safety_score ?? 0, analysis: res.meta.analysis ?? ""
            };
            setAstarGame(nextAstar);
            setAstarStats({ ...localAstarStats });
          }));
        }

        if (!nextRl.game_over) {
          promises.push(stepAgent("rl", nextRl).then((res) => {
            nextRl = res.state;
            recordPosition(heatRl.current, nextRl.snake);
            localRlStats = {
              ...localRlStats, samples: localRlStats.samples + 1,
              inferenceMs: res.meta.inference_ms ?? 0,
              avgInferenceMs: (localRlStats.avgInferenceMs * localRlStats.samples + (res.meta.inference_ms ?? 0)) / (localRlStats.samples + 1),
              safetyScore: res.meta.safety_score ?? 0, analysis: res.meta.analysis ?? "",
              epsilon: res.meta.epsilon ?? 0
            };
            setRlGame(nextRl);
            setRlStats({ ...localRlStats });
          }));
        }

        if (!nextHuman.game_over) {
          promises.push(stepAgent("manual", nextHuman, humanDirectionRef.current).then((res) => {
            nextHuman = res.state;
            recordPosition(heatHuman.current, nextHuman.snake);
            localHumanStats = {
              ...localHumanStats, samples: localHumanStats.samples + 1,
              inferenceMs: res.meta.inference_ms ?? 0,
              avgInferenceMs: (localHumanStats.avgInferenceMs * localHumanStats.samples + (res.meta.inference_ms ?? 0)) / (localHumanStats.samples + 1),
              safetyScore: res.meta.safety_score ?? 0, analysis: res.meta.analysis ?? ""
            };
            setHumanGame(nextHuman);
            setHumanStats({ ...localHumanStats });
          }));
        }

        await Promise.all(promises);

        steps += 1;
        if (nextAstar.game_over && nextRl.game_over && nextHuman.game_over) break;
        await new Promise((r) => window.setTimeout(r, TICK_DELAY_MS));
      }

      if (!loopCancelledRef.current) {
        const duration = (steps * TICK_DELAY_MS) / 1000;
        const save = (type, gs) => api.post("/api/agent/save_game", {
          agent_type: type, score: gs.score, nb_steps: gs.step_count, duration,
          cause_mort: gs.game_over ? "battle" : "timeout",
          obstacles_actifs: gs.obstacles.length > 0, longueur_serpent: gs.snake.length
        }).catch(() => {});
        save("astar", nextAstar);
        save("rl", nextRl);

        const scores = { astar: nextAstar.score, rl: nextRl.score, human: nextHuman.score };
        const winner = Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
        setBattleHistory((h) => [...h, {
          round: roundNumber, astarScore: nextAstar.score, rlScore: nextRl.score, humanScore: nextHuman.score,
          astarSteps: nextAstar.step_count, rlSteps: nextRl.step_count, humanSteps: nextHuman.step_count, winner
        }]);
        setShowHeatmap(true);
      }
    } catch (e) {
      setError(e.message || "Erreur pendant la simulation");
    } finally {
      if (!loopCancelledRef.current) setIsRunning(false);
    }
  };

  const resetBattle = () => {
    loopCancelledRef.current = true;
    setIsRunning(false); setIsPaused(false); setError(""); setShowHeatmap(false);
    setBattleHistory([]); setCurrentRound(0);
    setAstarStats(createInitialLiveStats("astar"));
    setRlStats(createInitialLiveStats("rl"));
    setHumanStats(createInitialLiveStats("manual"));
    setAstarGame(createInitialGameState());
    setRlGame(createInitialGameState());
    setHumanGame(createInitialGameState());
    heatAstar.current = createHeatmap();
    heatRl.current = createHeatmap();
    heatHuman.current = createHeatmap();
  };

  const togglePause = () => { if (isRunning) setIsPaused((v) => !v); };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-100 mb-1">Battle Arena IA</h1>
        <p className="text-slate-400 text-sm">
          Duel en temps réel — A* vs Q-Learning vs Joueur Humain (flèches directionnelles).
        </p>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={startBattle} disabled={isRunning}
          className="px-6 py-2 bg-emerald-500 text-slate-950 rounded-lg font-semibold disabled:opacity-50 text-sm">
          {isRunning ? "Battle en cours…" : "Start Battle"}
        </button>
        <button onClick={togglePause} disabled={!isRunning}
          className="px-6 py-2 bg-sky-600 text-white rounded-lg font-semibold disabled:opacity-50 text-sm">
          {isPaused ? "Reprendre" : "Pause"}
        </button>
        <button onClick={resetBattle}
          className="px-6 py-2 bg-slate-700 text-white rounded-lg font-semibold text-sm">
          Reset
        </button>
        {showHeatmap && (
          <button onClick={() => setShowHeatmap((v) => !v)}
            className="px-6 py-2 bg-violet-700 text-white rounded-lg font-semibold text-sm">
            {showHeatmap ? "Masquer heatmap" : "Voir heatmap"}
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <ArenaCard title="Agent A*" badge="IA algorithmique" accentClass="text-emerald-400" accentBorderClass="border-emerald-500/40"
          canvasRef={canvasAstarRef} gameState={astarGame} liveStats={astarStats} />
        <ArenaCard title="Agent Q-Learning" badge="IA apprenante" accentClass="text-sky-400" accentBorderClass="border-sky-500/40"
          canvasRef={canvasRlRef} gameState={rlGame} liveStats={rlStats} />
        <ArenaCard title="Joueur Humain" badge="Flèches directionnelles" accentClass="text-amber-400" accentBorderClass="border-amber-500/40"
          canvasRef={canvasHumanRef} gameState={humanGame} liveStats={humanStats} />
      </div>

      {showHeatmap && (
        <div className="bg-slate-900/80 rounded-xl border border-violet-500/30 p-4">
          <h3 className="text-lg font-semibold text-violet-300 mb-1">Heatmap de fréquentation</h3>
          <p className="text-xs text-slate-400 mb-4">
            Zones les plus visitées par chaque agent durant la manche — rouge = fréquence élevée, bleu = faible.
          </p>
          <div className="flex justify-center">
            <canvas ref={canvasHeatmapRef} className="rounded-lg border border-slate-700" />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4">
          <h3 className="text-base font-semibold text-slate-100 mb-3">Comparaison live</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis type="category" dataKey="label" stroke="#cbd5e1" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="astar" name="A*" fill="#22c55e" radius={[0, 3, 3, 0]} />
                <Bar dataKey="rl" name="Q-Learning" fill="#38bdf8" radius={[0, 3, 3, 0]} />
                <Bar dataKey="human" name="Humain" fill="#f97316" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4">
          <h3 className="text-base font-semibold text-slate-100 mb-3">Profil des agents</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="65%">
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <Radar name="A*" dataKey="astar" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} />
                <Radar name="Q-Learning" dataKey="rl" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} />
                <Radar name="Humain" dataKey="human" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {battleHistory.length > 0 && (
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4">
          <h3 className="text-base font-semibold text-slate-100 mb-4">Historique des batailles</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-400 border-b border-slate-700 text-xs">
                <tr>
                  <th className="pb-2">Round</th>
                  <th className="pb-2">Score A*</th>
                  <th className="pb-2">Score RL</th>
                  <th className="pb-2">Score Humain</th>
                  <th className="pb-2">Steps A*</th>
                  <th className="pb-2">Steps RL</th>
                  <th className="pb-2">Steps Humain</th>
                  <th className="pb-2">Vainqueur</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {battleHistory.map((entry) => (
                  <tr key={entry.round} className="border-b border-slate-800">
                    <td className="py-2">{entry.round}</td>
                    <td className="py-2">{entry.astarScore}</td>
                    <td className="py-2">{entry.rlScore}</td>
                    <td className="py-2">{entry.humanScore}</td>
                    <td className="py-2">{entry.astarSteps}</td>
                    <td className="py-2">{entry.rlSteps}</td>
                    <td className="py-2">{entry.humanSteps}</td>
                    <td className="py-2 font-semibold">
                      {entry.winner === "astar" && <span className="text-emerald-400">A*</span>}
                      {entry.winner === "rl" && <span className="text-sky-400">Q-Learning</span>}
                      {entry.winner === "human" && <span className="text-amber-400">Humain</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default BattleArena;
