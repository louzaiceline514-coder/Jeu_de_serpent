/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:  ["Inter", "Segoe UI", "sans-serif"],
        title: ["Poppins", "Inter", "sans-serif"],
        mono:  ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        // Charte graphique — accents sémantiques
        "accent-astar":   "#3B82F6", // Blue 500   — A*
        "accent-rl":      "#8B5CF6", // Violet 500 — Q-Learning
        "accent-player":  "#10B981", // Emerald 500 — Joueur / Serpent
        "accent-danger":  "#EF4444", // Red 500    — Collision
        "accent-warning": "#F59E0B", // Amber 500  — Obstacles
      },
    },
  },
  plugins: [],
};
