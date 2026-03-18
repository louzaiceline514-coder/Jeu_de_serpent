import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { wsConnected, wsDisconnected, wsMessage } from "../store/wsSlice";
import { setGameState } from "../store/gameSlice";
import { wsService } from "../services/websocket";

// Hook custom pour gérer la connexion WebSocket et dispatcher les états de jeu.

function useWebSocket() {
  const dispatch = useDispatch();
  const alreadyConnectedRef = useRef(false);

  useEffect(() => {
    // En mode dev, React.StrictMode peut monter/démonter 2 fois : on évite une double connexion WS.
    if (alreadyConnectedRef.current) return;
    alreadyConnectedRef.current = true;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const url = import.meta.env.DEV ? `${protocol}//${host}:5173/ws` : `${protocol}//${host}:8000/ws`;

    wsService.connect(
      url,
      () => {
        dispatch(wsConnected());
        // On force un reset pour recevoir un premier état immédiatement.
        wsService.send("reset", {});
      },
      (data) => {
        dispatch(wsMessage(data));
        if (data.type === "game_state" && data.payload) {
          dispatch(setGameState(data.payload));
        }
      },
      () => {
        dispatch(wsDisconnected());
      }
    );

    return () => {
      alreadyConnectedRef.current = false;
      wsService.disconnect();
    };
  }, [dispatch]);
}

export default useWebSocket;
