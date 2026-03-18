import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer
} from "recharts";
import { fetchComparison, fetchHistory } from "../store/statsSlice";

// Composant d'affichage des statistiques comparatives A* vs RL.

function StatsComparison() {
  const dispatch = useDispatch();
  const { astar, rl, history } = useSelector((state) => state.stats);
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
      }, 300);

      return () => window.clearTimeout(timeoutId);
    }
    return undefined;
  }, [dispatch, lastMessage]);

  const handleExportCSV = () => {
    const rows = [
      ["agent_type", "score", "nb_steps", "duration", "created_at"],
      ...history.map((h) => [h.agent_type, h.score, h.nb_steps, h.duration, h.created_at])
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "snake_ai_stats.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const lineData = useMemo(() => {
    const astarHistory = history.filter((entry) => entry.agent_type === "astar").slice(-20);
    const rlHistory = history.filter((entry) => entry.agent_type === "rl").slice(-20);
    const maxLength = Math.max(astarHistory.length, rlHistory.length);

    return Array.from({ length: maxLength }, (_, index) => ({
      game: index + 1,
      astar: astarHistory[index]?.score ?? null,
      rl: rlHistory[index]?.score ?? null
    }));
  }, [history]);

  const barData = [
    {
      name: "A*",
      avg: astar.avg_score,
      best: astar.best_score,
      winRate: Number((astar.win_rate * 100).toFixed(1))
    },
    {
      name: "RL",
      avg: rl.avg_score,
      best: rl.best_score,
      winRate: Number((rl.win_rate * 100).toFixed(1))
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-200">
          Comparaison des performances A* vs Q-Learning
        </h2>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-100"
        >
          Export CSV
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Ces statistiques sont calculees a partir des parties réellement enregistrees en base pour A*
        et Q-Learning. La vue se rafraichit automatiquement pendant que des parties se terminent.
      </p>

      <div className="grid grid-cols-1 gap-4 text-xs">
        <div className="bg-slate-900/80 rounded-lg p-3 space-y-2">
          <p className="text-slate-400">Tableau comparatif</p>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400">
                <th className="border-b border-slate-700 py-1">Agent</th>
                <th className="border-b border-slate-700 py-1">Score moyen</th>
                <th className="border-b border-slate-700 py-1">Meilleur score</th>
                <th className="border-b border-slate-700 py-1">Parties</th>
                <th className="border-b border-slate-700 py-1">Taux survie</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">A*</td>
                <td>{astar.avg_score.toFixed(2)}</td>
                <td>{astar.best_score}</td>
                <td>{astar.games_played}</td>
                <td>{(astar.win_rate * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="py-1">Q-Learning</td>
                <td>{rl.avg_score.toFixed(2)}</td>
                <td>{rl.best_score}</td>
                <td>{rl.games_played}</td>
                <td>{(rl.win_rate * 100).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-900/80 rounded-lg p-3 h-80 overflow-hidden">
          <p className="text-xs text-slate-400 mb-1">
            Évolution du score sur les dernières parties
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="game" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="astar" stroke="#22c55e" dot={false} />
                <Line type="monotone" dataKey="rl" stroke="#38bdf8" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-slate-900/80 rounded-lg p-3 h-80 overflow-hidden">
          <p className="text-xs text-slate-400 mb-1">
            Comparaison score moyen / meilleur / taux de survie
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar dataKey="avg" fill="#22c55e" name="Score moyen" />
                <Bar dataKey="best" fill="#a855f7" name="Meilleur score" />
                <Bar dataKey="winRate" fill="#38bdf8" name="Taux de survie (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsComparison;
