import { useEffect } from "react";
import { useSelector } from "react-redux";
import { wsService } from "../services/websocket";

// Hook qui écoute les flèches du clavier et envoie les directions au backend.

function useKeyboard(enabled = true) {
  const mode = useSelector((state) => state.game.mode);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const onKeyDown = (e) => {
      if (mode !== "manual") return;
      let dir = null;
      if (e.key === "ArrowUp") dir = "UP";
      if (e.key === "ArrowDown") dir = "DOWN";
      if (e.key === "ArrowLeft") dir = "LEFT";
      if (e.key === "ArrowRight") dir = "RIGHT";
      if (dir) {
        e.preventDefault();
        wsService.send("direction", { dir });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, mode]);
}

export default useKeyboard;
