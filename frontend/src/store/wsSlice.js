import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  connected: false,
  lastMessage: null
};

const wsSlice = createSlice({
  name: "ws",
  initialState,
  reducers: {
    wsConnected(state) {
      state.connected = true;
    },
    wsDisconnected(state) {
      state.connected = false;
    },
    wsMessage(state, action) {
      state.lastMessage = action.payload;
    }
  }
});

export const { wsConnected, wsDisconnected, wsMessage } = wsSlice.actions;
export default wsSlice.reducer;

