import React, { useRef, useState, useEffect } from "react";
import Snake from "./Snake";

function GameGrid() {
  const containerRef = useRef(null);
  const [availableSize, setAvailableSize] = useState({ w: 500, h: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setAvailableSize({ w: width, h: height - 32 }); // 32 = label "Aire de jeu"
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center h-full min-h-[72vh] w-full space-y-2">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Aire de jeu</p>
      <Snake availableWidth={availableSize.w} availableHeight={availableSize.h} />
    </div>
  );
}

export default GameGrid;
