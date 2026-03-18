import React, { useState } from "react";
import GameGrid from "./components/GameGrid";
import ControlPanel from "./components/ControlPanel";
import Dashboard from "./components/Dashboard";
import StatsComparison from "./components/StatsComparison";
import TrainingPanel from "./components/TrainingPanel";
import BattleArena from "./components/BattleArena";
import AmbientAudioControls from "./components/AmbientAudioControls";
import useWebSocket from "./hooks/useWebSocket";
import useKeyboard from "./hooks/useKeyboard";

function App() {
  const [view, setView] = useState("game"); // "game" | "stats" | "battle"
  useWebSocket();
  useKeyboard();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between bg-slate-900/80 backdrop-blur">
        <h1 className="text-xl font-semibold text-slate-50">Snake AI – Dashboard SAE4</h1>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <nav className="space-x-2">
            <button
              onClick={() => setView("game")}
              className={`px-3 py-1 rounded text-sm ${
                view === "game" ? "bg-emerald-500 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              Jeu
            </button>
            <button
              onClick={() => setView("battle")}
              className={`px-3 py-1 rounded text-sm ${
                view === "battle" ? "bg-purple-500 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              A* vs Q-Learning
            </button>
            <button
              onClick={() => setView("stats")}
              className={`px-3 py-1 rounded text-sm ${
                view === "stats" ? "bg-emerald-500 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              Stats
            </button>
          </nav>
          <AmbientAudioControls />
        </div>
      </header>

      {view === "game" ? (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 p-4">
          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col">
            <GameGrid />
          </section>
          <section className="space-y-4">
            <ControlPanel />
            <Dashboard />
          </section>
        </main>
      ) : view === "battle" ? (
        <main className="flex-1 p-4">
          <BattleArena />
        </main>
      ) : (
        <main className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 p-4">
          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <StatsComparison />
          </section>
          <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <TrainingPanel />
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
