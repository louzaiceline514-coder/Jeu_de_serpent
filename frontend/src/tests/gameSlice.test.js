import { describe, it, expect } from "vitest";
import gameReducer, { setGameState, setMode } from "../store/gameSlice";

describe("gameSlice", () => {
  const initialState = {
    snake: [],
    food: null,
    obstacles: [],
    score: 0,
    mode: "manual",
    gameOver: false,
    gridSize: 20,
    stepCount: 0,
    direction: "DROITE",
  };

  it("retourne l'état initial", () => {
    const state = gameReducer(undefined, { type: "unknown" });
    expect(state.score).toBe(0);
    expect(state.gameOver).toBe(false);
    expect(state.mode).toBe("manual");
    expect(state.snake).toEqual([]);
  });

  it("setGameState met à jour le score", () => {
    const state = gameReducer(
      initialState,
      setGameState({ score: 7, snake: [{ x: 5, y: 5 }], game_over: false })
    );
    expect(state.score).toBe(7);
    expect(state.snake).toEqual([{ x: 5, y: 5 }]);
  });

  it("setGameState met à jour gameOver", () => {
    const state = gameReducer(initialState, setGameState({ game_over: true }));
    expect(state.gameOver).toBe(true);
  });

  it("setMode change le mode vers astar", () => {
    const state = gameReducer(initialState, setMode("astar"));
    expect(state.mode).toBe("astar");
  });

  it("setMode change le mode vers rl", () => {
    const state = gameReducer(initialState, setMode("rl"));
    expect(state.mode).toBe("rl");
  });

  it("setGameState ne réinitialise pas le mode si absent du payload", () => {
    let state = gameReducer(initialState, setMode("astar"));
    state = gameReducer(state, setGameState({ score: 3 }));
    expect(state.mode).toBe("astar");
  });

  it("setGameState met à jour stepCount", () => {
    const state = gameReducer(initialState, setGameState({ step_count: 42 }));
    expect(state.stepCount).toBe(42);
  });
});
