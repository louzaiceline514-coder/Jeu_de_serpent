import { createSlice } from "@reduxjs/toolkit";

// État du jeu côté frontend
const initialState = {
  snake: [],
  food: null,
  obstacles: [],
  score: 0,
  mode: "manual", // manual | astar | rl
  gameOver: false,
  gridSize: 20,
  stepCount: 0,
  direction: "DROITE"
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setGameState(state, action) {
      const payload = action.payload || {};
      state.snake = payload.snake || [];
      state.food = payload.food || null;
      state.obstacles = payload.obstacles || [];
      state.score = payload.score ?? 0;
      state.gameOver = payload.game_over ?? false;
      state.mode = payload.mode || state.mode;
      state.stepCount = payload.step_count ?? 0;
      state.direction = payload.direction || state.direction;
    },
    setMode(state, action) {
      state.mode = action.payload;
    }
  }
});

export const { setGameState, setMode } = gameSlice.actions;
export default gameSlice.reducer;
