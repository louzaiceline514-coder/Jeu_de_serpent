import React, { useEffect, useRef, useState } from "react";

function AmbientAudioControls() {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(42);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
    audio.loop = true;
    return () => {
      audio.pause();
    };
  }, []);

  const updateVolume = (nextVolume) => {
    const clamped = Math.max(0, Math.min(100, nextVolume));
    setVolume(clamped);
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = clamped / 100;
    }
    if (audioRef.current && audioRef.current.paused && !isMuted) {
      audioRef.current.play().catch(() => {});
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) {
      if (next) {
        audioRef.current.pause();
      } else {
        audioRef.current.volume = volume / 100;
        audioRef.current.play().catch(() => {});
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} src="/music/theme1.mp3" loop />
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs">
        <span className="uppercase tracking-[0.25em] text-slate-500">Musique</span>
        <button
          onClick={() => updateVolume(volume - 8)}
          className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200"
        >
          -
        </button>
        <span className="min-w-14 text-center text-slate-200">{isMuted ? "Mute" : `${volume}%`}</span>
        <button
          onClick={() => updateVolume(volume + 8)}
          className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200"
        >
          +
        </button>
        <button
          onClick={toggleMute}
          className="rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 px-3 py-1 font-medium text-slate-950"
        >
          {isMuted ? "Activer" : "Couper"}
        </button>
      </div>
    </>
  );
}

export default AmbientAudioControls;
