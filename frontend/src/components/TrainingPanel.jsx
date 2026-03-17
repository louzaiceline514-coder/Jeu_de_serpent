import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../services/api";
import { fetchTrainingResults } from "../store/statsSlice";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// Panneau de lancement d'entraînement Q-Learning.

function TrainingPanel() {
  const [episodes, setEpisodes] = useState(200);
  const [learningRate] = useState(0.1); // affichage seulement, fixé côté backend
  const [epsilon] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const { trainingScores } = useSelector((state) => state.stats);

  const handleStart = async () => {
    setLoading(true);
    try {
      await api.post("/api/training/start", { episodes, agent_type: "rl" });
      await dispatch(fetchTrainingResults());
    } finally {
      setLoading(false);
    }
  };

  const data = trainingScores.map((score, index) => ({
    episode: index + 1,
    score
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-slate-200">Entraînement Q-Learning</h2>
      <div className="space-y-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-slate-400">Nombre d&apos;épisodes</span>
          <input
            type="number"
            value={episodes}
            onChange={(e) => setEpisodes(parseInt(e.target.value, 10) || 0)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
            min={10}
            max={5000}
          />
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-slate-400">Learning rate (α)</p>
            <p className="text-slate-200">{learningRate}</p>
          </div>
          <div className="flex-1">
            <p className="text-slate-400">Epsilon initial (ε)</p>
            <p className="text-slate-200">{epsilon}</p>
          </div>
        </div>
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full px-3 py-2 rounded bg-emerald-500 text-slate-900 text-xs font-semibold disabled:opacity-50"
        >
          {loading ? "Entraînement en cours..." : "Lancer l'entraînement"}
        </button>
      </div>

      <div className="h-48 bg-slate-900/80 rounded-lg p-2 overflow-hidden">
        <p className="text-[11px] text-slate-400 mb-1">
          Score par épisode pendant l&apos;entraînement
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="episode" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#22c55e" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default TrainingPanel;

