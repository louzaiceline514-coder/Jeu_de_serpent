import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import Dashboard from "../components/Dashboard";
import gameReducer from "../store/gameSlice";
import statsReducer from "../store/statsSlice";
import wsReducer from "../store/wsSlice";
import uiReducer from "../store/uiSlice";

function renderWithStore(ui, preloadedState = {}) {
  const store = configureStore({
    reducer: {
      game: gameReducer,
      stats: statsReducer,
      ui: uiReducer,
      ws: wsReducer,
    },
    preloadedState,
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe("Dashboard", () => {
  it("s'affiche sans erreur", () => {
    renderWithStore(<Dashboard />);
    expect(screen.getByText("Dashboard temps réel")).toBeTruthy();
  });

  it("affiche le score initial à 0", () => {
    renderWithStore(<Dashboard />);
    const scores = screen.getAllByText("0");
    expect(scores.length).toBeGreaterThan(0);
  });

  it("affiche le mode manuel par défaut", () => {
    renderWithStore(<Dashboard />);
    expect(screen.getByText("manual")).toBeTruthy();
  });

  it("affiche 'En cours' quand la partie est active", () => {
    renderWithStore(<Dashboard />, {
      game: { score: 0, stepCount: 5, mode: "astar", gameOver: false },
    });
    expect(screen.getByText("En cours")).toBeTruthy();
  });

  it("affiche 'Terminé' quand la partie est terminée", () => {
    renderWithStore(<Dashboard />, {
      game: { score: 5, stepCount: 100, mode: "rl", gameOver: true },
    });
    expect(screen.getByText("Terminé")).toBeTruthy();
  });

  it("affiche le score fourni", () => {
    renderWithStore(<Dashboard />, {
      game: { score: 12, stepCount: 50, mode: "manual", gameOver: false },
    });
    expect(screen.getByText("12")).toBeTruthy();
  });
});
