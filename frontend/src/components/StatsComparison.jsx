import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { fetchComparison, fetchHistory } from "../store/statsSlice";

const AGENT_META = {
  manual: { label: "Manuel", color: "#f97316" },
  astar: { label: "A*", color: "#10b981" },
  rl: { label: "Q-Learning", color: "#38bdf8" }
};

function formatDuration(seconds) {
  return `${Number(seconds ?? 0).toFixed(2)} s`;
}

function formatScore(value) {
  return Number(value ?? 0).toFixed(2);
}

function StatsComparison() {
  const dispatch = useDispatch();
  const { manual, astar, rl, history } = useSelector((state) => state.stats);
  const lastMessage = useSelector((state) => state.ws.lastMessage);

  useEffect(() => {
    dispatch(fetchComparison());
    dispatch(fetchHistory());

    const intervalId = window.setInterval(() => {
      dispatch(fetchComparison());
      dispatch(fetchHistory());
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [dispatch]);

  useEffect(() => {
    if (lastMessage?.type === "game_state" && lastMessage?.payload?.game_over) {
      const timeoutId = window.setTimeout(() => {
        dispatch(fetchComparison());
        dispatch(fetchHistory());
      }, 250);

      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [dispatch, lastMessage]);

  const agents = [
    { key: "manual", stats: manual },
    { key: "astar", stats: astar },
    { key: "rl", stats: rl }
  ];

  const handleExportCSV = () => {
    const rows = [
      ["agent_type", "agent_name", "score", "nb_steps", "duration", "created_at"],
      ...history.map((entry) => [
        entry.agent_type,
        entry.agent_name,
        entry.score,
        entry.nb_steps,
        entry.duration,
        entry.created_at
      ])
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "snake_parties_reelles.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const lineData = useMemo(() => {
    const recentByAgent = Object.keys(AGENT_META).reduce((accumulator, key) => {
      accumulator[key] = history.filter((entry) => entry.agent_type === key).slice(-12);
      return accumulator;
    }, {});

    const maxLength = Math.max(...Object.values(recentByAgent).map((entries) => entries.length), 0);

    return Array.from({ length: maxLength }, (_, index) => ({
      game: index + 1,
      manual: recentByAgent.manual[index]?.score ?? null,
      astar: recentByAgent.astar[index]?.score ?? null,
      rl: recentByAgent.rl[index]?.score ?? null
    }));
  }, [history]);

  const summaryData = agents.map(({ key, stats }) => ({
    name: AGENT_META[key].label,
    avg: Number((stats.avg_score ?? 0).toFixed(2)),
    best: stats.best_score ?? 0,
    survival: Number(((stats.win_rate ?? 0) * 100).toFixed(1))
  }));

  const recentGames = useMemo(() => history.slice(-12).reverse(), [history]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Statistiques réelles des parties</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            Cette vue regroupe désormais les données du manuel, de A* et de Q-Learning à
            partir des parties réellement jouées et enregistrées.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100"
        >
          Exporter les parties
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {agents.map(({ key, stats }) => (
          <AgentCard key={key} agentKey={key} stats={stats} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-sm font-medium text-slate-100">Évolution des derniers scores</p>
          <p className="mb-4 mt-1 text-xs text-slate-400">
            Les courbes représentent les vraies parties des trois modes, et non plus un benchmark
            isolé.
          </p>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="game" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="manual" stroke={AGENT_META.manual.color} dot={false} name="Manuel" />
                <Line type="monotone" dataKey="astar" stroke={AGENT_META.astar.color} dot={false} name="A*" />
                <Line type="monotone" dataKey="rl" stroke={AGENT_META.rl.color} dot={false} name="Q-Learning" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-sm font-medium text-slate-100">Synthèse comparative</p>
          <p className="mb-4 mt-1 text-xs text-slate-400">
            Score moyen, meilleur score et taux de survie calculés sur les parties jouées.
          </p>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="avg" fill="#f97316" name="Score moyen" />
                <Bar dataKey="best" fill="#10b981" name="Meilleur score" />
                <Bar dataKey="survival" fill="#38bdf8" name="Taux de survie (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-100">Dernières parties</p>
            <p className="mt-1 text-xs text-slate-400">
              Historique brut des parties réellement terminées depuis l&apos;interface de jeu ou le duel.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
            {history.length} parties
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Mode</th>
                <th className="pb-3 pr-4">Score</th>
                <th className="pb-3 pr-4">Steps</th>
                <th className="pb-3 pr-4">Durée</th>
                <th className="pb-3 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentGames.map((entry) => (
                <tr key={`${entry.agent_type}-${entry.created_at}-${entry.score}`} className="border-b border-slate-900">
                  <td className="py-3 pr-4">{AGENT_META[entry.agent_type]?.label ?? entry.agent_name}</td>
                  <td className="py-3 pr-4">{entry.score}</td>
                  <td className="py-3 pr-4">{entry.nb_steps}</td>
                  <td className="py-3 pr-4">{formatDuration(entry.duration)}</td>
                  <td className="py-3 pr-4">{new Date(entry.created_at).toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agentKey, stats }) {
  const meta = AGENT_META[agentKey];

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.35)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Mode</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{meta.label}</h3>
        </div>
        <span
          className="h-12 w-12 rounded-2xl border"
          style={{ borderColor: `${meta.color}55`, backgroundColor: `${meta.color}22` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Parties" value={stats.games_played ?? 0} accent={meta.color} />
        <Metric label="Dernier score" value={stats.last_score ?? 0} accent={meta.color} />
        <Metric label="Score moyen" value={formatScore(stats.avg_score)} accent={meta.color} />
        <Metric label="Moyenne récente" value={formatScore(stats.recent_avg_score)} accent={meta.color} />
        <Metric label="Meilleur score" value={stats.best_score ?? 0} accent={meta.color} />
        <Metric label="Survie" value={`${((stats.win_rate ?? 0) * 100).toFixed(1)}%`} accent={meta.color} />
        <Metric label="Steps moyens" value={formatScore(stats.avg_steps)} accent={meta.color} />
        <Metric label="Durée moyenne" value={formatDuration(stats.avg_duration)} accent={meta.color} />
      </div>
    </article>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

export default StatsComparison;
