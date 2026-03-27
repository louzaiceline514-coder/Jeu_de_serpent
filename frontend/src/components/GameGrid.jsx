import React from "react";
import Snake from "./Snake";

// Conteneur visuel pour le canvas du jeu.

function GameGrid() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[72vh]">
      <Snake />
    </div>
  );
}

export default GameGrid;
