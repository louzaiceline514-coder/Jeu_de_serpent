import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import GameGrid from "./components/GameGrid";
import ControlPanel from "./components/ControlPanel";
import Dashboard from "./components/Dashboard";
import StatsComparison from "./components/StatsComparison";
import TrainingPanel from "./components/TrainingPanel";
import BattleArena from "./components/BattleArena";
import AmbientAudioControls from "./components/AmbientAudioControls";
import useWebSocket from "./hooks/useWebSocket";
import useKeyboard from "./hooks/useKeyboard";
import { wsService } from "./services/websocket";

/* ── Mini-snake décoratif pour l'écran d'accueil ─────── */
function MiniSnakeCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const CELL = 7;
    const COLS = 14;
    const ROWS = 10;
    canvas.width  = COLS * CELL;
    canvas.height = ROWS * CELL;

    // Chemin zigzag couvrant la grille
    const path = [];
    for (let row = 0; row < ROWS; row++) {
      const range = row % 2 === 0
        ? Array.from({ length: COLS }, (_, i) => i)
        : Array.from({ length: COLS }, (_, i) => COLS - 1 - i);
      range.forEach((col) => path.push({ x: col, y: row }));
    }

    let head = 5;
    const LENGTH = 6;

    function draw() {
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < LENGTH; i++) {
        const idx = (head - i + path.length) % path.length;
        const { x, y } = path[idx];
        const ratio = 1 - i / LENGTH;
        ctx.fillStyle = i === 0
          ? `rgba(187,247,208,${ratio})`
          : `rgba(34,197,94,${ratio * 0.85})`;
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      }
    }

    let tick = 0;
    let rafId;
    function loop() {
      tick++;
      if (tick % 8 === 0) head = (head + 1) % path.length;
      draw();
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-lg border border-emerald-900/40 opacity-70"
    />
  );
}

/* ── Écran d'accueil ─────────────────────────────────── */
const MODES = [
  {
    key: "manual",
    label: "Manuel",
    icon: "🕹️",
    desc: "Tu contrôles le serpent avec les flèches du clavier.",
    color: "emerald",
  },
  {
    key: "astar",
    label: "A*",
    icon: "🔭",
    desc: "L'IA utilise A* pour trouver la nourriture.",
    color: "sky",
  },
  {
    key: "rl",
    label: "Q-Learning",
    icon: "🧠",
    desc: "Agent par renforcement, apprend en jouant.",
    color: "purple",
  },
];

function WelcomeScreen({ onEnter }) {
  const [selected, setSelected] = useState("manual");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then(async (agents) => {
        const results = {};
        await Promise.all(
          agents.map(async (a) => {
            try {
              const s = await fetch(`/api/agents/${a.id}/stats`).then((r) => r.json());
              results[a.type] = s;
            } catch (_) {}
          })
        );
        setStats(results);
      })
      .catch(() => {});
  }, []);

  const colorMap = {
    emerald: {
      border: "border-emerald-500",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      btn: "bg-emerald-500 hover:bg-emerald-400",
    },
    sky: {
      border: "border-sky-500",
      bg: "bg-sky-500/10",
      text: "text-sky-400",
      btn: "bg-sky-500 hover:bg-sky-400",
    },
    purple: {
      border: "border-purple-500",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      btn: "bg-purple-500 hover:bg-purple-400",
    },
  };

  const selectedMode = MODES.find((m) => m.key === selected);
  const c = colorMap[selectedMode.color];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6 overflow-hidden">
      {/* Fond grille animée */}
      <div className="absolute inset-0 bg-grid-animated pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl animate-fadeInUp">
        {/* Titre */}
        <div className="text-center mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-400">Snake AI — SAE4</p>
          <div className="relative inline-block">
            <h1 className="text-5xl md:text-6xl font-bold animate-glitch">
              Snake <span className="text-emerald-400">AI</span>
            </h1>
            <div className="scan-line" />
          </div>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Choisis ton mode et lance la partie.
          </p>
        </div>

        {/* Mini snake + stats */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
          <MiniSnakeCanvas />
          {stats && (
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              {[
                { type: "human",  label: "Humain",     icon: "🕹️" },
                { type: "astar",  label: "A*",          icon: "🔭" },
                { type: "rl",     label: "Q-Learning",  icon: "🧠" },
              ].map((a) => {
                const s = stats[a.type];
                return (
                  <div key={a.type} className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                    <p className="text-lg mb-1">{a.icon}</p>
                    <p className="text-slate-400">{a.label}</p>
                    <p className="text-emerald-400 font-semibold">
                      {s ? `${s.games_played} parties` : "—"}
                    </p>
                    <p className="text-slate-300">
                      Best: {s ? s.best_score : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sélecteur de mode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {MODES.map((m) => {
            const active = selected === m.key;
            const col = colorMap[m.color];
            return (
              <button
                key={m.key}
                onClick={() => setSelected(m.key)}
                className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                  active
                    ? `${col.border} ${col.bg} shadow-lg`
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
                }`}
              >
                <p className="text-2xl mb-1">{m.icon}</p>
                <p className={`font-semibold text-sm ${active ? col.text : "text-slate-200"}`}>
                  {m.label}
                </p>
                <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Bouton Start */}
        <div className="text-center">
          <button
            onClick={() => onEnter(selected)}
            className={`px-10 py-3 rounded-xl font-semibold text-slate-950 transition-colors ${c.btn}`}
          >
            Lancer en mode {selectedMode.label} →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── App principale ──────────────────────────────────── */
const THEMES = [
  { label: "🟣 Purple", filter: "hue-rotate(200deg)" },
];

function App() {
  const [hasEntered, setHasEntered]     = useState(false);
  const [initialMode, setInitialMode]   = useState("manual");
  const [view, setView]                 = useState("game");
  const [themeIdx, setThemeIdx]         = useState(0);
  const [viewVisible, setViewVisible]   = useState(true);
  const audioRef = useRef(null);

  const score     = useSelector((s) => s.game.score);
  const connected = useSelector((s) => s.ws.connected);

  useWebSocket(hasEntered);
  useKeyboard(hasEntered);

  // Envoie le mode sélectionné dès que le WebSocket est prêt
  useEffect(() => {
    if (hasEntered && connected) {
      wsService.send("set_mode", { mode: initialMode });
    }
  }, [hasEntered, connected, initialMode]);

  const handleEnter = (mode) => {
    setInitialMode(mode);
    setHasEntered(true);
    setTimeout(() => audioRef.current?.startMusic(), 150);
  };

  const changeView = (v) => {
    setViewVisible(false);
    setTimeout(() => {
      setView(v);
      setViewVisible(true);
    }, 180);
  };

  const cycleTheme = () => setThemeIdx((i) => (i + 1) % THEMES.length);

  if (!hasEntered) {
    return <WelcomeScreen onEnter={handleEnter} />;
  }

  const theme = THEMES[themeIdx];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ filter: theme.filter, transition: "filter 0.4s ease" }}
    >
      <header className="border-b border-slate-800 px-6 py-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-50">Snake AI – SAE4</h1>
          {/* WS status */}
          <span className="flex items-center gap-1.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full pulse-dot ${
                connected ? "bg-emerald-400 text-emerald-400" : "bg-red-400 text-red-400"
              }`}
            />
            <span className={connected ? "text-emerald-400" : "text-red-400"}>
              {connected ? "Backend OK" : "Déconnecté"}
            </span>
          </span>
          {/* Score live */}
          {hasEntered && (
            <span className="bg-slate-800 border border-slate-700 rounded-full px-2.5 py-0.5 text-xs text-emerald-400 font-semibold">
              Score : {score}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation */}
          <nav className="flex gap-1.5">
            {[
              { key: "game",     label: "Jeu",          color: "emerald" },
              { key: "battle",   label: "A* vs QL",     color: "purple"  },
              { key: "training", label: "Entraînement", color: "emerald" },
              { key: "stats",    label: "Stats",        color: "emerald" },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => changeView(v.key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  view === v.key
                    ? v.color === "purple"
                      ? "bg-purple-500 text-slate-900"
                      : "bg-emerald-500 text-slate-900"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {v.label}
              </button>
            ))}
          </nav>

          <AmbientAudioControls ref={audioRef} />
        </div>
      </header>

      {/* Contenu avec transition de vue */}
      <div
        style={{
          opacity: viewVisible ? 1 : 0,
          transform: viewVisible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 0.18s ease, transform 0.18s ease",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {view === "game" ? (
          <main className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,2.2fr)_minmax(380px,1fr)] gap-4 p-4 items-stretch">
            <section className="h-full">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[78vh] h-full">
                <GameGrid />
              </div>
            </section>
            <section className="grid gap-4 auto-rows-fr h-full">
              <div className="h-full"><ControlPanel /></div>
              <div className="h-full"><Dashboard /></div>
            </section>
          </main>
        ) : view === "battle" ? (
          <main className="flex-1 p-4"><BattleArena /></main>
        ) : view === "stats" ? (
          <main className="flex-1 p-4">
            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <StatsComparison />
            </section>
          </main>
        ) : (
          <main className="flex-1 grid grid-cols-1 gap-4 p-4">
            <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <TrainingPanel />
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

export default App;
