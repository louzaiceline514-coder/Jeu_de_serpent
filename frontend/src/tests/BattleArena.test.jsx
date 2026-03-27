import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BattleArena from "../components/BattleArena";

// Mock du module api pour éviter les appels réseau réels
vi.mock("../services/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock de ResizeObserver absent dans jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("BattleArena", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("s'affiche sans erreur", () => {
    render(<BattleArena />);
    expect(screen.getByText("Battle Arena IA")).toBeTruthy();
  });

  it("affiche le sous-titre descriptif", () => {
    render(<BattleArena />);
    expect(
      screen.getByText(/Duel en temps réel/i)
    ).toBeTruthy();
  });

  it("affiche les boutons Start, Pause et Reset", () => {
    render(<BattleArena />);
    expect(screen.getByText("Start Battle")).toBeTruthy();
    expect(screen.getByText("Pause")).toBeTruthy();
    expect(screen.getByText("Reset")).toBeTruthy();
  });

  it("le bouton Start est actif et le bouton Pause est désactivé au départ", () => {
    render(<BattleArena />);
    const startBtn = screen.getByText("Start Battle").closest("button");
    const pauseBtn = screen.getByText("Pause").closest("button");
    expect(startBtn.disabled).toBe(false);
    expect(pauseBtn.disabled).toBe(true);
  });

  it("affiche les deux cards d'agents", () => {
    render(<BattleArena />);
    expect(screen.getByText("Agent A*")).toBeTruthy();
    expect(screen.getByText("Agent Q-Learning")).toBeTruthy();
  });

  it("affiche les scores initiaux à 0", () => {
    render(<BattleArena />);
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it("réinitialise l'état après Reset", async () => {
    const user = userEvent.setup();
    render(<BattleArena />);
    await user.click(screen.getByText("Reset").closest("button"));
    // Après reset, le bouton Start doit rester actif
    const startBtn = screen.getByText("Start Battle").closest("button");
    expect(startBtn.disabled).toBe(false);
  });
});
