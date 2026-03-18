import React, { useEffect } from "react";
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
import { api } from "../services/api";

// Composant d'affichage des statistiques comparatives A* vs RL.

function StatsComparison() {
  const dispatch = useDispatch();
  const { astar, rl, history } = useSelector((state) => state.stats);

  useEffect(() => {
    console.log("📊 Chargement initial des stats...");
    dispatch(fetchComparison());
    dispatch(fetchHistory());
  }, [dispatch]);

  const handleBenchmark = async (type, episodes) => {
    console.log(`🚀 Lancement benchmark ${type} avec ${episodes} épisodes...`);
    
    try {
      console.log(`📤 Envoi de la requête à /api/training/start...`);
      const response = await api.post("/api/training/start", { episodes, agent_type: type });
      console.log(`📥 Réponse reçue:`, response);
      
      console.log(`🔄 Mise à jour des stats...`);
      dispatch(fetchComparison());
      dispatch(fetchHistory());
      console.log(`✅ Benchmark terminé et stats mises à jour`);
    } catch (error) {
      console.error(`❌ Erreur lors du benchmark ${type}:`, error);
      alert(`Erreur lors du benchmark ${type}: ${error.message}`);
    }
  };

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

  const lineData = history.map((h, index) => ({
    index,
    astar: h.agent_type === "astar" ? h.score : null,
    rl: h.agent_type === "rl" ? h.score : null
  }));

  const barData = [
    {
      name: "A*",
      avg: astar.avg_score,
      best: astar.best_score,
      winRate: astar.win_rate
    },
    {
      name: "RL",
      avg: rl.avg_score,
      best: rl.best_score,
      winRate: rl.win_rate
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
        et Q-Learning.
      </p>

      <div className="grid md:grid-cols-2 gap-4 text-xs">
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

        <div className="bg-slate-900/80 rounded-lg p-3 space-y-2">
          <p className="text-slate-400">Benchmarks rapides</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleBenchmark("astar", 50)}
              className="flex-1 px-3 py-1 rounded bg-emerald-500 text-slate-900 text-xs font-medium"
            >
              Lancer 50 parties A*
            </button>
            <button
              onClick={() => handleBenchmark("rl", 50)}
              className="flex-1 px-3 py-1 rounded bg-sky-500 text-slate-900 text-xs font-medium"
            >
              Lancer 50 parties RL
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Ces boutons lancent des séries de 50 parties côté backend et mettent à jour les
            statistiques agrégées.
          </p>
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
                <XAxis dataKey="index" stroke="#64748b" />
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
                <Bar dataKey="winRate" fill="#38bdf8" name="Taux de survie" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsComparison;
