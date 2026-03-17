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
  astar: { avg_score: 0, best_score: 0, games_played: 0, win_rate: 0 },
  rl: { avg_score: 0, best_score: 0, games_played: 0, win_rate: 0 },
  history: [],
  trainingScores: [],
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
        state.astar = action.payload.astar || state.astar;
        state.rl = action.payload.rl || state.rl;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.history = action.payload || [];
      })
      .addCase(fetchTrainingResults.fulfilled, (state, action) => {
        state.trainingScores = action.payload.scores || [];
      });
  }
});

export default statsSlice.reducer;

