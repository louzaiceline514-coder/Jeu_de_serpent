import React, { useEffect, useMemo, useState } from "react";
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
import ReplayViewer from "./ReplayViewer";

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
  const [replayGameId, setReplayGameId] = useState(null);

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

  const handleExportJSON = () => {
    const data = {
      exported_at: new Date().toISOString(),
      summary: { manual, astar, rl },
      history
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "snake_stats.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Snake AI — Rapport de statistiques", 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Généré le : ${new Date().toLocaleString("fr-FR")}`, 14, 26);

    let y = 36;
    const colLabels = ["Métrique", "Manuel", "A*", "Q-Learning"];
    const metrics = [
      ["Parties jouées", manual.games_played, astar.games_played, rl.games_played],
      ["Score moyen", formatScore(manual.avg_score), formatScore(astar.avg_score), formatScore(rl.avg_score)],
      ["Score médian", formatScore(manual.median_score), formatScore(astar.median_score), formatScore(rl.median_score)],
      ["Meilleur score", manual.best_score, astar.best_score, rl.best_score],
      ["Dernier score", manual.last_score, astar.last_score, rl.last_score],
      ["Taux de survie", `${((manual.win_rate ?? 0) * 100).toFixed(1)}%`, `${((astar.win_rate ?? 0) * 100).toFixed(1)}%`, `${((rl.win_rate ?? 0) * 100).toFixed(1)}%`],
      ["Steps moyens", formatScore(manual.avg_steps), formatScore(astar.avg_steps), formatScore(rl.avg_steps)],
      ["Durée moyenne", formatDuration(manual.avg_duration), formatDuration(astar.avg_duration), formatDuration(rl.avg_duration)],
    ];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Synthèse par agent", 14, y);
    y += 8;

    const colWidths = [60, 40, 40, 40];
    const colX = [14, 74, 114, 154];

    // Header row
    doc.setFillColor(15, 23, 42);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.rect(14, y - 4, 182, 8, "F");
    colLabels.forEach((label, i) => doc.text(label, colX[i], y));
    doc.setTextColor(0, 0, 0);
    y += 8;

    metrics.forEach((row, rowIndex) => {
      if (rowIndex % 2 === 0) {
        doc.setFillColor(240, 240, 250);
        doc.rect(14, y - 4, 182, 8, "F");
      }
      doc.setFont("helvetica", rowIndex === 0 ? "bold" : "normal");
      row.forEach((cell, i) => doc.text(String(cell ?? "—"), colX[i], y));
      y += 8;
    });

    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Historique des ${Math.min(history.length, 20)} dernières parties`, 14, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const histHeaders = ["Mode", "Score", "Steps", "Durée", "Date"];
    const histX = [14, 50, 80, 115, 145];
    doc.setFillColor(15, 23, 42);
    doc.setTextColor(255, 255, 255);
    doc.rect(14, y - 4, 182, 7, "F");
    histHeaders.forEach((h, i) => doc.text(h, histX[i], y));
    doc.setTextColor(0, 0, 0);
    y += 7;

    doc.setFont("helvetica", "normal");
    history.slice(-20).reverse().forEach((entry, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (i % 2 === 0) {
        doc.setFillColor(245, 245, 252);
        doc.rect(14, y - 4, 182, 7, "F");
      }
      doc.text(AGENT_META[entry.agent_type]?.label ?? entry.agent_name, histX[0], y);
      doc.text(String(entry.score), histX[1], y);
      doc.text(String(entry.nb_steps), histX[2], y);
      doc.text(formatDuration(entry.duration), histX[3], y);
      doc.text(new Date(entry.created_at).toLocaleDateString("fr-FR"), histX[4], y);
      y += 7;
    });

    doc.save("snake_rapport.pdf");
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
    median: Number((stats.median_score ?? 0).toFixed(2)),
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
            Cette vue regroupe les données du manuel, de A* et de Q-Learning à partir des parties réellement jouées et enregistrées.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100"
          >
            CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100"
          >
            JSON
          </button>
          <button
            onClick={handleExportPDF}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100"
          >
            PDF
          </button>
        </div>
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
            Courbes des vraies parties des trois modes.
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
            Score moyen, médian, meilleur et taux de survie.
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
                <Bar dataKey="median" fill="#a855f7" name="Score médian" />
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
              Historique brut des parties terminées — cliquez sur ▶ pour rejouer.
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
                <th className="pb-3">Replay</th>
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
                  <td className="py-3">
                    {entry.game_id ? (
                      <button
                        onClick={() => setReplayGameId(entry.game_id)}
                        className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600"
                        title="Rejouer cette partie"
                      >
                        ▶
                      </button>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {replayGameId && (
        <ReplayViewer gameId={replayGameId} onClose={() => setReplayGameId(null)} />
      )}
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
        <Metric label="Score médian" value={formatScore(stats.median_score)} accent={meta.color} />
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
