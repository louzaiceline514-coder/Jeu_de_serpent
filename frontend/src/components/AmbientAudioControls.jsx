import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const TRACKS = [
  { label: "Theme 1", src: "/music/theme1.mp3" },
];

const AmbientAudioControls = forwardRef(function AmbientAudioControls(_, ref) {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    audio.loop = true;
  }, []);

  // Exposé à App.jsx pour démarrer la musique au clic Start
  useImperativeHandle(ref, () => ({
    startMusic() {
      const audio = audioRef.current;
      if (!audio || isPlaying) return;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    },
  }));

  const toggleSound = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      audio.play().then(() => {
        setIsPlaying(true);
        setIsMuted(false);
        audio.muted = false;
      }).catch(() => {});
      return;
    }

    const next = !isMuted;
    audio.muted = next;
    setIsMuted(next);
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <audio ref={audioRef} src={TRACKS[0].src} loop />
      <button
        onClick={toggleSound}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
        title={isMuted || !isPlaying ? "Activer la musique" : "Couper la musique"}
      >
        {isMuted || !isPlaying ? "🔇" : "🔊"}
        <span>{isMuted || !isPlaying ? "Son off" : "Son on"}</span>
      </button>
    </div>
  );
});

export default AmbientAudioControls;
