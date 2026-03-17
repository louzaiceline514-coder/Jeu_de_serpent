import { configureStore } from "@reduxjs/toolkit";
import gameReducer from "./gameSlice";
import statsReducer from "./statsSlice";
import wsReducer from "./wsSlice";

const store = configureStore({
  reducer: {
    game: gameReducer,
    stats: statsReducer,
    ws: wsReducer
  }
});

export default store;

