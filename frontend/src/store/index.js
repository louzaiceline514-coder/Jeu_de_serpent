import { configureStore } from "@reduxjs/toolkit";
import gameReducer from "./gameSlice";
import statsReducer from "./statsSlice";
import uiReducer from "./uiSlice";
import wsReducer from "./wsSlice";

const store = configureStore({
  reducer: {
    game: gameReducer,
    stats: statsReducer,
    ui: uiReducer,
    ws: wsReducer,
  },
});

export default store;

