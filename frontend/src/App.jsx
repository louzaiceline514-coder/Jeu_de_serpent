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
  const [hasEntered, setHasEntered] = useState(false);
  const [view, setView] = useState("game"); // "game" | "battle" | "stats" | "training"
  useWebSocket(hasEntered);
  useKeyboard(hasEntered);

  if (!hasEntered) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-8 md:p-12 text-center space-y-6 shadow-2xl">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Snake AI SAE4</p>
            <h1 className="text-4xl md:text-5xl font-bold">Choisis quand lancer la partie</h1>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Commence d&apos;abord par entrer dans l&apos;application, puis tu pourras choisir ton mode
              de jeu et cliquer sur <span className="text-emerald-300">Start</span> seulement quand tu
              veux vraiment demarrer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-left">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm font-semibold text-slate-100">Mode Manuel</p>
              <p className="text-xs text-slate-400 mt-2">Choix du mode puis demarrage au clic.</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm font-semibold text-slate-100">Mode A*</p>
              <p className="text-xs text-slate-400 mt-2">La partie ne se lance plus automatiquement.</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm font-semibold text-slate-100">Mode Q-Learning</p>
              <p className="text-xs text-slate-400 mt-2">Meme principe avec Start / Reset / Pause.</p>
            </div>
          </div>

          <button
            onClick={() => setHasEntered(true)}
            className="px-8 py-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition-colors"
          >
            Start
          </button>
        </div>
      </div>
    );
  }

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
              onClick={() => setView("training")}
              className={`px-3 py-1 rounded text-sm ${
                view === "training" ? "bg-emerald-500 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >
              Entrainement
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
        <main className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,2.2fr)_minmax(380px,1fr)] gap-4 p-4 items-stretch">
          <section className="h-full">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col min-h-[78vh] h-full">
              <GameGrid />
            </div>
          </section>
          <section className="grid gap-4 auto-rows-fr h-full">
            <div className="h-full">
              <ControlPanel />
            </div>
            <div className="h-full">
              <Dashboard />
            </div>
          </section>
        </main>
      ) : view === "battle" ? (
        <main className="flex-1 p-4">
          <BattleArena />
        </main>
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
  );
}

export default App;
