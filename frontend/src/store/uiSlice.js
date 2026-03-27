import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  speed: 150,
  audioEnabled: false,
  activeView: "game",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSpeed(state, action) {
      state.speed = action.payload;
    },
    setAudioEnabled(state, action) {
      state.audioEnabled = action.payload;
    },
    setActiveView(state, action) {
      state.activeView = action.payload;
    },
  },
});

export const { setSpeed, setAudioEnabled, setActiveView } = uiSlice.actions;
export default uiSlice.reducer;
