import React, { useEffect, useRef, useState } from "react";

function AmbientAudioControls() {
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const musicNodesRef = useRef([]);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(35);

  useEffect(() => {
    return () => {
      stopMusic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const stopMusic = () => {
    musicNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch (error) {
        // no-op
      }
      try {
        node.disconnect();
      } catch (error) {
        // no-op
      }
    });
    musicNodesRef.current = [];
  };

  const applyVolume = (nextVolume, muted = isMuted) => {
    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        muted ? 0 : nextVolume / 100,
        audioContextRef.current.currentTime,
        0.15
      );
    }
  };

  const ensureMusic = async () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        return;
      }
      audioContextRef.current = new AudioCtx();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.gain.value = 0;
      masterGainRef.current.connect(audioContextRef.current.destination);
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    if (musicNodesRef.current.length > 0) {
      applyVolume(volume);
      return;
    }

    const now = audioContextRef.current.currentTime;
    const masterGain = masterGainRef.current;

    const createPad = (frequency, type, detune, level) => {
      const oscillator = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      const filter = audioContextRef.current.createBiquadFilter();

      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;

      filter.type = "lowpass";
      filter.frequency.value = 540;
      filter.Q.value = 0.8;

      gain.gain.value = level;

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);
      oscillator.start(now);

      musicNodesRef.current.push(oscillator, gain, filter);
    };

    createPad(220, "sine", -4, 0.018);
    createPad(261.63, "triangle", 2, 0.012);
    createPad(329.63, "sine", 1, 0.01);

    applyVolume(volume);
  };

  const updateVolume = async (nextVolume) => {
    await ensureMusic();
    const clamped = Math.max(0, Math.min(100, nextVolume));
    setVolume(clamped);
    if (!isMuted) {
      applyVolume(clamped, false);
    }
  };

  const toggleMute = async () => {
    await ensureMusic();
    setIsMuted((value) => {
      const next = !value;
      applyVolume(volume, next);
      return next;
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-400">Ambiance</span>
      <button
        onClick={() => updateVolume(volume - 10)}
        className="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700"
      >
        -
      </button>
      <span className="min-w-14 text-center text-slate-200">{isMuted ? "Mute" : `${volume}%`}</span>
      <button
        onClick={() => updateVolume(volume + 10)}
        className="px-2 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700"
      >
        +
      </button>
      <button
        onClick={toggleMute}
        className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-medium"
      >
        {isMuted ? "Activer" : "Couper"}
      </button>
    </div>
  );
}

export default AmbientAudioControls;
