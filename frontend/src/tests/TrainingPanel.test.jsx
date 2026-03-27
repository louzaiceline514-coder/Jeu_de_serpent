import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import TrainingPanel from "../components/TrainingPanel";
import statsReducer from "../store/statsSlice";

// Mock du module api — fetchTrainingResults appelle api.get("/api/training/results")
vi.mock("../services/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      rl_scores: [],
      astar_scores: [],
      rl_summary: { episodes: 0, avg_score: 0, best_score: 0, survival_rate: 0 },
      astar_summary: { episodes: 0, avg_score: 0, best_score: 0, survival_rate: 0 },
    }),
    post: vi.fn().mockResolvedValue({}),
  },
}));

function renderWithStore(ui, preloadedState = {}) {
  const store = configureStore({
    reducer: { stats: statsReducer },
    preloadedState,
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe("TrainingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("s'affiche sans erreur", () => {
    renderWithStore(<TrainingPanel />);
    expect(screen.getByText(/Entrainement et analyse/i)).toBeTruthy();
  });

  it("affiche le bouton Entrainer Q-Learning", () => {
    renderWithStore(<TrainingPanel />);
    expect(screen.getByText("Entrainer Q-Learning")).toBeTruthy();
  });

  it("affiche le bouton Benchmarker A*", () => {
    renderWithStore(<TrainingPanel />);
    expect(screen.getByText("Benchmarker A*")).toBeTruthy();
  });

  it("affiche le champ nombre d'épisodes avec valeur 80 par défaut", () => {
    renderWithStore(<TrainingPanel />);
    const input = screen.getByRole("spinbutton");
    expect(input.value).toBe("80");
  });

  it("affiche les MetricCards RL moyen et A* moyen", () => {
    renderWithStore(<TrainingPanel />);
    expect(screen.getByText("RL moyen")).toBeTruthy();
    expect(screen.getByText("A* moyen")).toBeTruthy();
  });

  it("affiche les MetricCards RL meilleur et A* meilleur", () => {
    renderWithStore(<TrainingPanel />);
    expect(screen.getByText("RL meilleur")).toBeTruthy();
    expect(screen.getByText("A* meilleur")).toBeTruthy();
  });

  it("affiche les scores depuis le store Redux préchargé", () => {
    renderWithStore(<TrainingPanel />, {
      stats: {
        rlTrainingScores: [5, 10, 15],
        astarBenchmarkScores: [20, 25],
        rlTrainingSummary: { episodes: 3, avg_score: 10, best_score: 15, survival_rate: 0.8 },
        astarBenchmarkSummary: { episodes: 2, avg_score: 22.5, best_score: 25, survival_rate: 1.0 },
        loading: false,
      },
    });
    expect(screen.getByText("10.00")).toBeTruthy();  // RL moyen
    expect(screen.getByText("15")).toBeTruthy();      // RL meilleur
  });

  it("le toggle obstacle bascule l'état et affiche le message de performance", async () => {
    const user = userEvent.setup();
    renderWithStore(<TrainingPanel />);
    const toggle = screen.getByRole("button", { name: "" }); // bouton toggle sans texte
    await user.click(toggle);
    expect(
      screen.getByText(/Mode performance actif/i)
    ).toBeTruthy();
  });
});
