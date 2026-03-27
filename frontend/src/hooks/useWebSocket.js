import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { wsConnected, wsDisconnected, wsMessage } from "../store/wsSlice";
import { setGameState, applyDelta } from "../store/gameSlice";
import { wsService } from "../services/websocket";

// Hook custom pour gérer la connexion WebSocket et dispatcher les états de jeu.
// Supporte les messages binaires (orjson côté backend) et les deltas partiels (game_delta).

function useWebSocket(enabled = true) {
  const dispatch = useDispatch();
  const alreadyConnectedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      alreadyConnectedRef.current = false;
      wsService.disconnect();
      return undefined;
    }

    if (alreadyConnectedRef.current) return;
    alreadyConnectedRef.current = true;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const { host, hostname } = window.location;
    const url = import.meta.env.DEV ? `${protocol}//${host}/ws` : `${protocol}//${hostname}:8000/ws`;

    const handleMessage = (data) => {
      dispatch(wsMessage(data));
      if (data.type === "game_state" && data.payload) {
        dispatch(setGameState(data.payload));
      } else if (data.type === "game_delta" && data.payload) {
        dispatch(applyDelta(data.payload));
      }
    };

    wsService.connect(
      url,
      () => { dispatch(wsConnected()); },
      handleMessage,
      () => { dispatch(wsDisconnected()); }
    );

    return () => {
      alreadyConnectedRef.current = false;
      wsService.disconnect();
    };
  }, [dispatch, enabled]);
}

export default useWebSocket;
