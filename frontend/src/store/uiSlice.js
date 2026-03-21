import { createSlice } from "@reduxjs/toolkit";

// État de l'interface utilisateur (vitesse, audio, vue active)
const initialState = {
  speed: 150,          // intervalle en ms entre chaque tick de jeu
  audioEnabled: false, // son ambiant activé ou non
  activeView: "game",  // vue courante : "game" | "battle" | "stats" | "training"
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSpeed(state, action) {
      state.speed = action.payload;
    },
    setAudioEnabled(state, action) {
      state.audioEnabled = Boolean(action.payload);
    },
    setActiveView(state, action) {
      state.activeView = action.payload;
    },
  },
});

export const { setSpeed, setAudioEnabled, setActiveView } = uiSlice.actions;
export default uiSlice.reducer;
