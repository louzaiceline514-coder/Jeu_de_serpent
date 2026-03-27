import { createSlice } from "@reduxjs/toolkit";

// État du jeu côté frontend
const initialState = {
  snake: [],
  food: null,
  obstacles: [],
  dynamicObstacles: [],
  score: 0,
  mode: "manual", // manual | astar | rl | random
  gameOver: false,
  gridSize: 25,
  stepCount: 0,
  direction: "DROITE",
  astarPath: [],  // chemin planifié par A* pour la visualisation F6
  rlPath: [],     // chemin prédit par Q-Learning
  etat: "en_cours",
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
      state.dynamicObstacles = payload.dynamic_obstacles || [];
      state.score = payload.score ?? 0;
      state.gameOver = payload.game_over ?? false;
      state.mode = payload.mode || state.mode;
      state.stepCount = payload.step_count ?? 0;
      state.direction = payload.direction || state.direction;
      state.astarPath = payload.astar_path || [];
      state.rlPath = payload.rl_path || [];
      state.etat = payload.etat || "en_cours";
      if (payload.taille_grille) {
        const parsed = parseInt(payload.taille_grille.split("x")[0], 10);
        if (!isNaN(parsed)) state.gridSize = parsed;
      }
    },
    // Applique un delta partiel (champs dynamiques uniquement, sans écraser les champs statiques)
    applyDelta(state, action) {
      const d = action.payload || {};
      if (d.snake !== undefined) state.snake = d.snake;
      if (d.food !== undefined) state.food = d.food;
      if (d.dynamic_obstacles !== undefined) state.dynamicObstacles = d.dynamic_obstacles;
      if (d.score !== undefined) state.score = d.score;
      if (d.game_over !== undefined) state.gameOver = d.game_over;
      if (d.step_count !== undefined) state.stepCount = d.step_count;
      if (d.direction !== undefined) state.direction = d.direction;
      if (d.astar_path !== undefined) state.astarPath = d.astar_path;
      if (d.rl_path !== undefined) state.rlPath = d.rl_path;
      if (d.etat !== undefined) state.etat = d.etat;
    },
    setMode(state, action) {
      state.mode = action.payload;
    }
  }
});

export const { setGameState, applyDelta, setMode } = gameSlice.actions;
export default gameSlice.reducer;
