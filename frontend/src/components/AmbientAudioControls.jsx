import React, { useEffect, useRef, useState } from "react";

const LEAD_NOTES = [523.25, 659.25, 783.99, 659.25, 880, 783.99, 659.25, 587.33];
const BASS_NOTES = [130.81, 146.83, 164.81, 196, 164.81, 146.83, 130.81, 98];

function AmbientAudioControls() {
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const musicNodesRef = useRef([]);
  const loopTimerRef = useRef(null);
  const stepIndexRef = useRef(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(42);

  useEffect(() => {
    return () => {
      stopMusic();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const stopMusic = () => {
    if (loopTimerRef.current) {
      window.clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }

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
        0.12
      );
    }
  };

  const schedulePulse = (frequency, type, gainAmount, duration, detune = 0, filterType = "lowpass") => {
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;

    filter.type = filterType;
    filter.frequency.value = type === "square" ? 1450 : 920;
    filter.Q.value = 1.4;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainAmount, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainRef.current);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.05);
    musicNodesRef.current.push(oscillator, gain, filter);
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

    if (loopTimerRef.current) {
      applyVolume(volume);
      return;
    }

    stepIndexRef.current = 0;
    loopTimerRef.current = window.setInterval(() => {
      const step = stepIndexRef.current % LEAD_NOTES.length;
      const lead = LEAD_NOTES[step];
      const bass = BASS_NOTES[step];

      schedulePulse(lead, "square", 0.024, 0.18, step % 2 === 0 ? 2 : -3, "bandpass");
      schedulePulse(lead / 2, "triangle", 0.012, 0.26, -5);
      schedulePulse(bass, "sawtooth", 0.016, 0.24, 0, "lowpass");

      if (step % 2 === 0) {
        schedulePulse(lead * 1.5, "triangle", 0.006, 0.12, 1, "highpass");
      }

      stepIndexRef.current += 1;
    }, 220);

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
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs">
      <span className="uppercase tracking-[0.25em] text-slate-500">Arcade Audio</span>
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
  );
}

export default AmbientAudioControls;
