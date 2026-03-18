import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
const LIVE_WINDOW = 120;

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
  analysis: "En attente de simulation",
  deaths: 0
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
    return null;
  }
  return gameState.step_count / gameState.score;
};

const scoreMetric = (value, lowerIsBetter = false) => {
  const clamped = Math.max(0, Math.min(100, value));
  return lowerIsBetter ? 100 - clamped : clamped;
};

const buildRadarData = (astarGame, rlGame, astarStats, rlStats) => {
  const astarStepsFood = stepsPerFood(astarGame);
  const rlStepsFood = stepsPerFood(rlGame);

  return [
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
      astar: astarStepsFood ? scoreMetric((astarStepsFood / 24) * 100, true) : 45,
      rl: rlStepsFood ? scoreMetric((rlStepsFood / 24) * 100, true) : 45
    },
    {
      metric: "Survie",
      astar: scoreMetric((astarGame.step_count / MAX_STEPS) * 100),
      rl: scoreMetric((rlGame.step_count / MAX_STEPS) * 100)
    }
  ];
};

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
  ctx.lineWidth = 1;
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

const BattleOverlay = memo(function BattleOverlay({
  title,
  accentClass,
  accentBorderClass,
  gameState,
  liveStats
}) {
  const averageStepsPerFood = stepsPerFood(gameState);
  const safetyPercent = Math.round((liveStats.safetyScore ?? 0) * 100);

  return (
    <div className={`bg-slate-900/80 rounded-xl border ${accentBorderClass} p-4 space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={`text-lg font-semibold ${accentClass}`}>{title}</h2>
          <p className="text-sm text-slate-400">
            {gameState.game_over ? "Etat critique: partie terminee" : "Analyse en temps reel active"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            gameState.game_over ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {gameState.game_over ? "Game Over" : "Live"}
        </span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <StatCard label="Score" value={gameState.score} accentClass={accentClass} />
        <StatCard label="Step Count" value={gameState.step_count} accentClass={accentClass} />
        <StatCard
          label="Steps / Food"
          value={averageStepsPerFood ? averageStepsPerFood.toFixed(1) : "--"}
          accentClass={accentClass}
        />
        <StatCard
          label="Inference"
          value={`${liveStats.inferenceMs.toFixed(2)} ms`}
          accentClass={accentClass}
        />
        <StatCard
          label="Latency Avg"
          value={`${liveStats.avgInferenceMs.toFixed(2)} ms`}
          accentClass={accentClass}
        />
        <StatCard
          label="Exploration"
          value={liveStats.epsilon === null ? "--" : liveStats.epsilon.toFixed(3)}
          accentClass={accentClass}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Securite de zone</span>
          <span className={accentClass}>{safetyPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${accentClass === "text-emerald-400" ? "bg-emerald-400" : "bg-sky-400"}`}
            style={{ width: `${safetyPercent}%` }}
          />
        </div>
        <p className="text-sm text-slate-400">{liveStats.analysis}</p>
      </div>
    </div>
  );
});

const StatCard = memo(function StatCard({ label, value, accentClass }) {
  return (
    <div className="rounded-lg bg-slate-950/60 border border-slate-800 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
});

const BattleCharts = memo(function BattleCharts({
  lineData,
  radarData,
  battleHistory,
  comparisonData
}) {
  return (
    <>
      <div className="grid xl:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 h-[340px]">
          <h3 className="text-lg font-semibold text-slate-100 mb-1">Score cumule en direct</h3>
          <p className="text-sm text-slate-400 mb-4">
            Evolution tick par tick du score des deux agents pendant le duel.
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="tick" stroke="#64748b" />
              <YAxis stroke="#64748b" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="A*" stroke="#22c55e" strokeWidth={2.5} dot={false} />
              <Line
                type="monotone"
                dataKey="Q-Learning"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 h-[340px]">
          <h3 className="text-lg font-semibold text-slate-100 mb-1">Profil des agents</h3>
          <p className="text-sm text-slate-400 mb-4">
            Comparaison radar entre vitesse, precision, optimisation et survie.
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="65%">
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <Radar
                name="A*"
                dataKey="astar"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.3}
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

      {battleHistory.length > 0 ? (
        <div className="grid xl:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 h-[320px]">
            <h3 className="text-lg font-semibold text-slate-100 mb-1">Comparaison des rounds</h3>
            <p className="text-sm text-slate-400 mb-4">
              Resume des manches deja jouees pour comparer la regularite.
            </p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="agent" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar dataKey="scoreMoyen" fill="#10b981" name="Score moyen" />
                <Bar dataKey="meilleurScore" fill="#f59e0b" name="Meilleur score" />
                <Bar dataKey="tauxSurvie" fill="#38bdf8" name="Taux survie (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

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
        </div>
      ) : null}
    </>
  );
});

function BattleArena() {
  const [astarGame, setAstarGame] = useState(createInitialGameState);
  const [rlGame, setRlGame] = useState(createInitialGameState);
  const [astarStats, setAstarStats] = useState(createInitialLiveStats("astar"));
  const [rlStats, setRlStats] = useState(createInitialLiveStats("rl"));
  const [liveTimeline, setLiveTimeline] = useState([]);
  const [battleHistory, setBattleHistory] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState("");

  const canvasAstarRef = useRef(null);
  const canvasRlRef = useRef(null);
  const loopCancelledRef = useRef(false);
  const pausedRef = useRef(false);
  const astarLatencyRef = useRef({ total: 0, count: 0 });
  const rlLatencyRef = useRef({ total: 0, count: 0 });

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

  const lineData = useMemo(
    () =>
      liveTimeline.map((entry) => ({
        tick: entry.tick,
        "A*": entry.astarScore,
        "Q-Learning": entry.rlScore
      })),
    [liveTimeline]
  );

  const radarData = useMemo(
    () => buildRadarData(astarGame, rlGame, astarStats, rlStats),
    [astarGame, rlGame, astarStats, rlStats]
  );

  const comparisonData = useMemo(() => {
    if (battleHistory.length === 0) {
      return [];
    }

    const rounds = battleHistory.length;
    return [
      {
        agent: "A*",
        scoreMoyen: battleHistory.reduce((sum, item) => sum + item.astarScore, 0) / rounds,
        meilleurScore: Math.max(...battleHistory.map((item) => item.astarScore)),
        tauxSurvie:
          (battleHistory.filter((item) => !item.astarGameOver).length / rounds) * 100
      },
      {
        agent: "Q-Learning",
        scoreMoyen: battleHistory.reduce((sum, item) => sum + item.rlScore, 0) / rounds,
        meilleurScore: Math.max(...battleHistory.map((item) => item.rlScore)),
        tauxSurvie: (battleHistory.filter((item) => !item.rlGameOver).length / rounds) * 100
      }
    ];
  }, [battleHistory]);

  const initBattleState = async () => {
    const response = await api.post("/api/agent/init", {
      mode: "battle"
    });
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

  const updateLiveStats = (agentType, gameState, meta) => {
    const latencyRef = agentType === "astar" ? astarLatencyRef : rlLatencyRef;
    latencyRef.current.total += meta.inference_ms ?? 0;
    latencyRef.current.count += 1;
    const average = latencyRef.current.total / latencyRef.current.count;

    const nextStats = {
      agentType,
      inferenceMs: meta.inference_ms ?? 0,
      avgInferenceMs: average,
      epsilon: agentType === "rl" ? meta.epsilon ?? 0 : null,
      safetyScore: meta.safety_score ?? 0,
      analysis: meta.analysis ?? "Analyse indisponible",
      deaths: gameState.game_over ? 1 : 0
    };

    if (agentType === "astar") {
      setAstarStats(nextStats);
    } else {
      setRlStats(nextStats);
    }
  };

  const appendTimeline = (tick, nextAstarState, nextRlState, astarMeta, rlMeta) => {
    setLiveTimeline((history) => {
      const nextHistory = [
        ...history,
        {
          tick,
          astarScore: nextAstarState.score,
          rlScore: nextRlState.score,
          astarInference: astarMeta?.inference_ms ?? 0,
          rlInference: rlMeta?.inference_ms ?? 0
        }
      ];
      return nextHistory.slice(-LIVE_WINDOW);
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
    astarLatencyRef.current = { total: 0, count: 0 };
    rlLatencyRef.current = { total: 0, count: 0 };
    setLiveTimeline([]);
    setAstarStats(createInitialLiveStats("astar"));
    setRlStats(createInitialLiveStats("rl"));

    try {
      const baseState = await initBattleState();
      setCurrentRound((value) => value + 1);
      setAstarGame(cloneState(baseState));
      setRlGame(cloneState(baseState));

      let nextAstarState = cloneState(baseState);
      let nextRlState = cloneState(baseState);
      let steps = 0;

      while (!loopCancelledRef.current && steps < MAX_STEPS) {
        if (pausedRef.current) {
          await new Promise((resolve) => window.setTimeout(resolve, 100));
          continue;
        }

        let astarMeta = { inference_ms: 0, safety_score: 0, analysis: "Pause" };
        let rlMeta = { inference_ms: 0, safety_score: 0, analysis: "Pause", epsilon: 0 };

        if (!nextAstarState.game_over) {
          const result = await stepAgent("astar", nextAstarState);
          nextAstarState = result.state;
          astarMeta = result.meta;
          setAstarGame(nextAstarState);
          updateLiveStats("astar", nextAstarState, astarMeta);
        }

        if (!nextRlState.game_over) {
          const result = await stepAgent("rl", nextRlState);
          nextRlState = result.state;
          rlMeta = result.meta;
          setRlGame(nextRlState);
          updateLiveStats("rl", nextRlState, rlMeta);
        }

        steps += 1;
        appendTimeline(steps, nextAstarState, nextRlState, astarMeta, rlMeta);

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
    setLiveTimeline([]);
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
          Duel backend en temps reel avec KPIs live, latence d&apos;inference et analyse de survie.
        </p>
        <p className="text-slate-500 text-sm mt-2">
          Les compteurs et graphiques se mettent a jour a chaque tick sans bloquer le rendu des canvas.
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

      <div className="grid xl:grid-cols-2 gap-8">
        <div className="space-y-4">
          <BattleOverlay
            title="Agent A*"
            accentClass="text-emerald-400"
            accentBorderClass="border-emerald-500/40"
            gameState={astarGame}
            liveStats={astarStats}
          />
          <div className="bg-slate-900/80 rounded-xl border border-emerald-500/30 p-4">
            <canvas ref={canvasAstarRef} className="mx-auto border border-slate-700 rounded-lg" />
          </div>
        </div>

        <div className="space-y-4">
          <BattleOverlay
            title="Agent Q-Learning"
            accentClass="text-sky-400"
            accentBorderClass="border-sky-500/40"
            gameState={rlGame}
            liveStats={rlStats}
          />
          <div className="bg-slate-900/80 rounded-xl border border-sky-500/30 p-4">
            <canvas ref={canvasRlRef} className="mx-auto border border-slate-700 rounded-lg" />
          </div>
        </div>
      </div>

      <BattleCharts
        lineData={lineData}
        radarData={radarData}
        battleHistory={battleHistory}
        comparisonData={comparisonData}
      />
    </div>
  );
}

export default BattleArena;
