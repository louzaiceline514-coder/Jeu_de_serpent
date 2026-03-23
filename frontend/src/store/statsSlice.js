import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../services/api";

// Thunks pour récupérer les stats côté backend
export const fetchComparison = createAsyncThunk("stats/fetchComparison", async () => {
  console.log("📡 Appel API /api/stats/comparison...");
  const res = await api.get("/api/stats/comparison");
  console.log("📥 Données comparison reçues:", res);
  return res;
});

export const fetchHistory = createAsyncThunk("stats/fetchHistory", async () => {
  console.log("📡 Appel API /api/stats/history...");
  const res = await api.get("/api/stats/history");
  console.log("📥 Données history reçues:", res.length, "parties");
  return res;
});

export const fetchTrainingResults = createAsyncThunk(
  "stats/fetchTrainingResults",
  async () => {
    const res = await api.get("/api/training/results");
    return res;
  }
);

const initialState = {
  manual: { avg_score: 0, best_score: 0, games_played: 0, win_rate: 0, avg_steps: 0, avg_duration: 0 },
  astar: { avg_score: 0, best_score: 0, games_played: 0, win_rate: 0 },
  rl: { avg_score: 0, best_score: 0, games_played: 0, win_rate: 0 },
  history: [],
  rlTrainingScores: [],
  astarBenchmarkScores: [],
  rlTrainingSummary: { episodes: 0, avg_score: 0, best_score: 0, survival_rate: 0 },
  astarBenchmarkSummary: { episodes: 0, avg_score: 0, best_score: 0, survival_rate: 0 },
  loading: false
};

const statsSlice = createSlice({
  name: "stats",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchComparison.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchComparison.fulfilled, (state, action) => {
        state.loading = false;
        state.manual = action.payload.manual || state.manual;
        state.astar = action.payload.astar || state.astar;
        state.rl = action.payload.rl || state.rl;
      })
      .addCase(fetchComparison.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.history = action.payload || [];
      })
      .addCase(fetchTrainingResults.fulfilled, (state, action) => {
        state.rlTrainingScores = action.payload.rl_scores || [];
        state.astarBenchmarkScores = action.payload.astar_scores || [];
        state.rlTrainingSummary = action.payload.rl_summary || state.rlTrainingSummary;
        state.astarBenchmarkSummary =
          action.payload.astar_summary || state.astarBenchmarkSummary;
      });
  }
});

export default statsSlice.reducer;
