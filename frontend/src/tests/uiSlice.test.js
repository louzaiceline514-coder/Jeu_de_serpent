import { describe, it, expect } from "vitest";
import uiReducer, { setSpeed, setAudioEnabled, setActiveView } from "../store/uiSlice";

describe("uiSlice", () => {
  const initialState = {
    speed: 150,
    audioEnabled: false,
    activeView: "game",
  };

  it("retourne l'état initial", () => {
    const state = uiReducer(undefined, { type: "unknown" });
    expect(state.speed).toBe(150);
    expect(state.audioEnabled).toBe(false);
    expect(state.activeView).toBe("game");
  });

  it("setSpeed met à jour la vitesse", () => {
    const state = uiReducer(initialState, setSpeed(300));
    expect(state.speed).toBe(300);
  });

  it("setAudioEnabled active le son", () => {
    const state = uiReducer(initialState, setAudioEnabled(true));
    expect(state.audioEnabled).toBe(true);
  });

  it("setAudioEnabled désactive le son", () => {
    const state = uiReducer({ ...initialState, audioEnabled: true }, setAudioEnabled(false));
    expect(state.audioEnabled).toBe(false);
  });

  it("setActiveView change la vue vers battle", () => {
    const state = uiReducer(initialState, setActiveView("battle"));
    expect(state.activeView).toBe("battle");
  });

  it("setActiveView change la vue vers stats", () => {
    const state = uiReducer(initialState, setActiveView("stats"));
    expect(state.activeView).toBe("stats");
  });

  it("setActiveView change la vue vers training", () => {
    const state = uiReducer(initialState, setActiveView("training"));
    expect(state.activeView).toBe("training");
  });
});
