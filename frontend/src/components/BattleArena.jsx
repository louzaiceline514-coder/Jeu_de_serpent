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

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const TICK_DELAY_MS = 140;
const MAX_STEPS = 350;

const createInitialGameState = () => ({
  snake: [{ x: 10, y: 10 }],
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
  snake: state.snake.map((segment) => ({ ...segment })),
  food: state.food ? { ...state.food } : null,
  obstacles: state.obstacles.map((obstacle) => ({ ...obstacle })),
  dynamic_obstacles: (state.dynamic_obstacles ?? []).map((obstacle) => ({ ...obstacle })),
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

const stepsPerFood = (gameState) => {
  if (!gameState.score) {
    return 0;
  }
  return gameState.step_count / gameState.score;
};

const scoreMetric = (value, lowerIsBetter = false) => {
  const clamped = Math.max(0, Math.min(100, value));
  return lowerIsBetter ? 100 - clamped : clamped;
};

const buildBarData = (astarGame, rlGame, astarStats, rlStats) => [
  {
    label: "Score",
    astar: astarGame.score,
    rl: rlGame.score
  },
  {
    label: "Steps",
    astar: astarGame.step_count,
    rl: rlGame.step_count
  },
  {
    label: "Steps/Food",
    astar: Number(stepsPerFood(astarGame).toFixed(1)),
    rl: Number(stepsPerFood(rlGame).toFixed(1))
  },
  {
    label: "Latence",
    astar: Number(astarStats.avgInferenceMs.toFixed(2)),
    rl: Number(rlStats.avgInferenceMs.toFixed(2))
  },
  {
    label: "Securite",
    astar: Math.round((astarStats.safetyScore ?? 0) * 100),
    rl: Math.round((rlStats.safetyScore ?? 0) * 100)
  }
];

const buildRadarData = (astarGame, rlGame, astarStats, rlStats) => [
  {
    metric: "Vitesse",
    astar: scoreMetric((astarStats.avgInferenceMs / 12) * 100, true),
    rl: scoreMetric((rlStats.avgInferenceMs / 12) * 100, true)
  },
  {
    metric: "Precision",
    astar: astarGame.game_over ? 25 : 95,
    rl: rlGame.game_over ? 25 : 95
  },
  {
    metric: "Optimisation",
    astar: scoreMetric((stepsPerFood(astarGame) / 24) * 100, true),
    rl: scoreMetric((stepsPerFood(rlGame) / 24) * 100, true)
  },
  {
    metric: "Survie",
    astar: scoreMetric((astarGame.step_count / MAX_STEPS) * 100),
    rl: scoreMetric((rlGame.step_count / MAX_STEPS) * 100)
  }
];

const drawGrid = (canvas, gameState, snakeColor, foodColor) => {
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const size = GRID_SIZE * CELL_SIZE;
  canvas.width = size;
  canvas.height = size;

  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "#1e293b";
  for (let i = 0; i <= GRID_SIZE; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * CELL_SIZE, 0);
    ctx.lineTo(i * CELL_SIZE, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * CELL_SIZE);
    ctx.lineTo(size, i * CELL_SIZE);
    ctx.stroke();
  }

  ctx.fillStyle = "#475569";
  gameState.obstacles.forEach(({ x, y }) => {
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  });

  ctx.fillStyle = "#94a3b8";
  gameState.dynamic_obstacles.forEach(({ x, y }) => {
    ctx.fillRect(x * CELL_SIZE + 3, y * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6);
  });

  if (gameState.food) {
    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(
      gameState.food.x * CELL_SIZE + CELL_SIZE / 2,
      gameState.food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  gameState.snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? snakeColor : `${snakeColor}88`;
    ctx.fillRect(
      segment.x * CELL_SIZE + 1,
      segment.y * CELL_SIZE + 1,
      CELL_SIZE - 2,
      CELL_SIZE - 2
    );
  });
};

const StatPill = memo(function StatPill({ label, value, accentClass }) {
  return (
    <div className="rounded-lg bg-slate-950/60 border border-slate-800 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
});

const ArenaCard = memo(function ArenaCard({
  title,
  accentClass,
  accentBorderClass,
  canvasRef,
  gameState,
  liveStats
}) {
  const safetyPercent = Math.round((liveStats.safetyScore ?? 0) * 100);

  return (
    <div className={`bg-slate-900/80 rounded-xl border ${accentBorderClass} p-4 space-y-4`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${accentClass}`}>{title}</h2>
          <p className="text-sm text-slate-400">
            {gameState.game_over ? "Partie terminee" : "Comparaison en direct"}
          </p>
        </div>
        <span className={gameState.game_over ? "text-red-400 text-sm" : "text-emerald-400 text-sm"}>
          {gameState.game_over ? "Game Over" : "Live"}
        </span>
      </div>

      <div className="flex justify-center">
        <canvas ref={canvasRef} className="border border-slate-700 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <StatPill label="Score" value={gameState.score} accentClass={accentClass} />
        <StatPill label="Steps" value={gameState.step_count} accentClass={accentClass} />
        <StatPill
          label="Steps/Food"
          value={gameState.score ? stepsPerFood(gameState).toFixed(1) : "--"}
          accentClass={accentClass}
        />
        <StatPill
          label="Inference"
          value={`${liveStats.inferenceMs.toFixed(2)} ms`}
          accentClass={accentClass}
        />
        <StatPill
          label="Moyenne"
          value={`${liveStats.avgInferenceMs.toFixed(2)} ms`}
          accentClass={accentClass}
        />
        <StatPill
          label="Exploration"
          value={liveStats.epsilon === null ? "--" : liveStats.epsilon.toFixed(3)}
          accentClass={accentClass}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Securite de zone</span>
          <span className={accentClass}>{safetyPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={accentClass === "text-emerald-400" ? "h-full bg-emerald-400" : "h-full bg-sky-400"}
            style={{ width: `${safetyPercent}%` }}
          />
        </div>
        <p className="text-sm text-slate-400">{liveStats.analysis}</p>
      </div>
    </div>
  );
});

function BattleArena() {
  const [astarGame, setAstarGame] = useState(createInitialGameState);
  const [rlGame, setRlGame] = useState(createInitialGameState);
  const [astarStats, setAstarStats] = useState(createInitialLiveStats("astar"));
  const [rlStats, setRlStats] = useState(createInitialLiveStats("rl"));
  const [battleHistory, setBattleHistory] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState("");

  const canvasAstarRef = useRef(null);
  const canvasRlRef = useRef(null);
  const loopCancelledRef = useRef(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    drawGrid(canvasAstarRef.current, astarGame, "#22c55e", "#ef4444");
    drawGrid(canvasRlRef.current, rlGame, "#38bdf8", "#f59e0b");
  }, [astarGame, rlGame]);

  useEffect(() => {
    return () => {
      loopCancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  const barData = useMemo(
    () => buildBarData(astarGame, rlGame, astarStats, rlStats),
    [astarGame, rlGame, astarStats, rlStats]
  );

  const radarData = useMemo(
    () => buildRadarData(astarGame, rlGame, astarStats, rlStats),
    [astarGame, rlGame, astarStats, rlStats]
  );

  const initBattleState = async () => {
    const response = await api.post("/api/agent/init", { mode: "battle" });
    return normalizeState(response.payload);
  };

  const stepAgent = async (agentType, gameState) => {
    const response = await api.post("/api/agent/step", {
      agent_type: agentType,
      game_state: gameState
    });

    return {
      state: normalizeState(response.payload),
      meta: response.meta ?? {}
    };
  };

  const updateLiveStats = (setter, currentStats, meta) => {
    const samples = currentStats.samples + 1;
    const avgInferenceMs =
      (currentStats.avgInferenceMs * currentStats.samples + (meta.inference_ms ?? 0)) / samples;

    setter({
      ...currentStats,
      inferenceMs: meta.inference_ms ?? 0,
      avgInferenceMs,
      epsilon: currentStats.agentType === "rl" ? meta.epsilon ?? 0 : null,
      safetyScore: meta.safety_score ?? 0,
      analysis: meta.analysis ?? "Analyse indisponible",
      samples
    });
  };

  const startBattle = async () => {
    if (isRunning) {
      return;
    }

    setError("");
    setIsRunning(true);
    setIsPaused(false);
    loopCancelledRef.current = false;
    setAstarStats(createInitialLiveStats("astar"));
    setRlStats(createInitialLiveStats("rl"));

    try {
      const baseState = await initBattleState();

      setCurrentRound((value) => value + 1);
      setAstarGame(cloneState(baseState));
      setRlGame(cloneState(baseState));

      let nextAstarState = cloneState(baseState);
      let nextRlState = cloneState(baseState);
      let localAstarStats = createInitialLiveStats("astar");
      let localRlStats = createInitialLiveStats("rl");
      let steps = 0;

      while (!loopCancelledRef.current && steps < MAX_STEPS) {
        if (pausedRef.current) {
          await new Promise((resolve) => window.setTimeout(resolve, 100));
          continue;
        }

        if (!nextAstarState.game_over) {
          const result = await stepAgent("astar", nextAstarState);
          nextAstarState = result.state;
          localAstarStats = {
            ...localAstarStats,
            samples: localAstarStats.samples + 1,
            inferenceMs: result.meta.inference_ms ?? 0,
            avgInferenceMs:
              (localAstarStats.avgInferenceMs * localAstarStats.samples +
                (result.meta.inference_ms ?? 0)) /
              (localAstarStats.samples + 1),
            safetyScore: result.meta.safety_score ?? 0,
            analysis: result.meta.analysis ?? "Analyse indisponible"
          };
          setAstarGame(nextAstarState);
          setAstarStats(localAstarStats);
        }

        if (!nextRlState.game_over) {
          const result = await stepAgent("rl", nextRlState);
          nextRlState = result.state;
          localRlStats = {
            ...localRlStats,
            samples: localRlStats.samples + 1,
            inferenceMs: result.meta.inference_ms ?? 0,
            avgInferenceMs:
              (localRlStats.avgInferenceMs * localRlStats.samples + (result.meta.inference_ms ?? 0)) /
              (localRlStats.samples + 1),
            safetyScore: result.meta.safety_score ?? 0,
            analysis: result.meta.analysis ?? "Analyse indisponible",
            epsilon: result.meta.epsilon ?? 0
          };
          setRlGame(nextRlState);
          setRlStats(localRlStats);
        }

        steps += 1;
        if (nextAstarState.game_over && nextRlState.game_over) {
          break;
        }

        await new Promise((resolve) => window.setTimeout(resolve, TICK_DELAY_MS));
      }

      if (!loopCancelledRef.current) {
        setBattleHistory((history) => [
          ...history,
          {
            round: currentRound + 1,
            astarScore: nextAstarState.score,
            rlScore: nextRlState.score,
            astarSteps: nextAstarState.step_count,
            rlSteps: nextRlState.step_count,
            astarGameOver: nextAstarState.game_over,
            rlGameOver: nextRlState.game_over
          }
        ]);
      }
    } catch (battleError) {
      setError(battleError.message || "Erreur pendant la simulation");
    } finally {
      if (!loopCancelledRef.current) {
        setIsRunning(false);
      }
    }
  };

  const resetBattle = () => {
    loopCancelledRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
    setError("");
    setBattleHistory([]);
    setCurrentRound(0);
    setAstarStats(createInitialLiveStats("astar"));
    setRlStats(createInitialLiveStats("rl"));
    setAstarGame(createInitialGameState());
    setRlGame(createInitialGameState());
  };

  const togglePause = () => {
    if (!isRunning) {
      return;
    }
    setIsPaused((value) => !value);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">A* vs Q-Learning Battle Arena</h1>
        <p className="text-slate-400">
          Duel en temps reel avec la logique backend reelle des deux agents.
        </p>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={startBattle}
          disabled={isRunning}
          className="px-6 py-2 bg-emerald-500 text-slate-950 rounded-lg font-semibold disabled:opacity-50"
        >
          {isRunning ? "Battle in Progress..." : "Start Battle"}
        </button>
        <button
          onClick={togglePause}
          disabled={!isRunning}
          className="px-6 py-2 bg-sky-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button
          onClick={resetBattle}
          className="px-6 py-2 bg-slate-700 text-white rounded-lg font-semibold"
        >
          Reset
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <ArenaCard
          title="Agent A*"
          accentClass="text-emerald-400"
          accentBorderClass="border-emerald-500/40"
          canvasRef={canvasAstarRef}
          gameState={astarGame}
          liveStats={astarStats}
        />
        <ArenaCard
          title="Agent Q-Learning"
          accentClass="text-sky-400"
          accentBorderClass="border-sky-500/40"
          canvasRef={canvasRlRef}
          gameState={rlGame}
          liveStats={rlStats}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-1">Graphique en barres</h3>
          <p className="text-sm text-slate-400 mb-4">
            Comparaison directe des indicateurs live entre A* et Q-Learning.
          </p>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis type="category" dataKey="label" stroke="#cbd5e1" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="astar" name="A*" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="rl" name="Q-Learning" fill="#38bdf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-1">Profil des agents</h3>
          <p className="text-sm text-slate-400 mb-4">
            Schema en toile d&apos;araignee pour comparer vitesse, precision, optimisation et survie.
          </p>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="65%">
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <Radar
                  name="A*"
                  dataKey="astar"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.30}
                />
                <Radar
                  name="Q-Learning"
                  dataKey="rl"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.25}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {battleHistory.length > 0 ? (
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Historique des batailles</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="pb-2">Round</th>
                  <th className="pb-2">Score A*</th>
                  <th className="pb-2">Score Q-Learning</th>
                  <th className="pb-2">Steps A*</th>
                  <th className="pb-2">Steps Q-Learning</th>
                  <th className="pb-2">Vainqueur</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {battleHistory.map((entry) => (
                  <tr key={entry.round} className="border-b border-slate-800">
                    <td className="py-2">{entry.round}</td>
                    <td className="py-2">{entry.astarScore}</td>
                    <td className="py-2">{entry.rlScore}</td>
                    <td className="py-2">{entry.astarSteps}</td>
                    <td className="py-2">{entry.rlSteps}</td>
                    <td className="py-2 font-semibold">
                      {entry.astarScore > entry.rlScore ? (
                        <span className="text-emerald-400">A*</span>
                      ) : entry.rlScore > entry.astarScore ? (
                        <span className="text-sky-400">Q-Learning</span>
                      ) : (
                        <span className="text-amber-400">Egalite</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BattleArena;
