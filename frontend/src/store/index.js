import { configureStore } from "@reduxjs/toolkit";
import gameReducer from "./gameSlice";
import statsReducer from "./statsSlice";
import wsReducer from "./wsSlice";
import uiReducer from "./uiSlice";

const store = configureStore({
  reducer: {
    game: gameReducer,
    stats: statsReducer,
    ws: wsReducer,
    ui: uiReducer,
  },
});

export default store;

