import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { midiToFreq, freqToMidi, midiToNoteName } from "@/lib/chordEngine";
import { playSingleGuitarNote, playInTuneChime } from "@/lib/audioSynth";

export const Route = createFileRoute("/tuner")({
  head: () => ({
    meta: [
      { title: "Guitar Tuner — MeloFY" },
      { name: "description", content: "Mobile-first chromatic guitar tuner inspired by GuitarTuna with interactive headstock, auto/manual tuning, and pitch detection." },
    ],
  }),
  component: TunerPage,
});

interface InstrumentPreset {
  name: string;
  type: "guitar" | "bass" | "ukulele";
  strings: { name: string; note: string; midi: number }[];
}

const PRESETS: Record<string, InstrumentPreset> = {
  "Guitar (Standard)": {
    name: "Guitar (Standard)",
    type: "guitar",
    strings: [
      { name: "E", note: "E2", midi: 40 },
      { name: "A", note: "A2", midi: 45 },
      { name: "D", note: "D3", midi: 50 },
      { name: "G", note: "G3", midi: 55 },
      { name: "B", note: "B3", midi: 59 },
      { name: "E", note: "E4", midi: 64 },
    ],
  },
  "Guitar (Drop D)": {
    name: "Guitar (Drop D)",
    type: "guitar",
    strings: [
      { name: "D", note: "D2", midi: 38 },
      { name: "A", note: "A2", midi: 45 },
      { name: "D", note: "D3", midi: 50 },
      { name: "G", note: "G3", midi: 55 },
      { name: "B", note: "B3", midi: 59 },
      { name: "E", note: "E4", midi: 64 },
    ],
  },
  "Bass (Standard)": {
    name: "Bass (Standard)",
    type: "bass",
    strings: [
      { name: "E", note: "E1", midi: 28 },
      { name: "A", note: "A1", midi: 33 },
      { name: "D", note: "D2", midi: 38 },
      { name: "G", note: "G2", midi: 43 },
    ],
  },
  "Ukulele (Standard)": {
    name: "Ukulele (Standard)",
    type: "ukulele",
    strings: [
      { name: "G", note: "G4", midi: 67 },
      { name: "C", note: "C4", midi: 60 },
      { name: "E", note: "E4", midi: 64 },
      { name: "A", note: "A4", midi: 69 },
    ],
  },
};

type PresetName = keyof typeof PRESETS;

// Peg coordinates relative to a w-[260px] h-[320px] headstock container
// 6-string Guitar Peg Coordinates
const PEGS_GUITAR = [
  { left: "2px", top: "220px" },  // E2 (Low E)
  { left: "2px", top: "140px" },  // A2
  { left: "2px", top: "60px" },   // D3
  { right: "2px", top: "60px" },  // G3
  { right: "2px", top: "140px" }, // B3
  { right: "2px", top: "220px" }, // E4 (High E)
];

// 4-string Bass / Ukulele Peg Coordinates
const PEGS_4STRING = [
  { left: "8px", top: "180px" },  // Peg 0
  { left: "8px", top: "90px" },   // Peg 1
  { right: "8px", top: "90px" },  // Peg 2
  { right: "8px", top: "180px" }, // Peg 3
];

function TunerPage() {
  const [presetName, setPresetName] = useState<PresetName>("Guitar (Standard)");
  const [autoMode, setAutoMode] = useState(true);
  const [activeStringIndex, setActiveStringIndex] = useState<number>(0);
  const [listening, setListening] = useState(false);
  const [permError, setPermError] = useState("");
  const [freq, setFreq] = useState(0);
  const [noteName, setNoteName] = useState("—");
  const [cents, setCents] = useState(0);
  const [targetFreq, setTargetFreq] = useState(0);
  const [isPerfect, setIsPerfect] = useState(false);

  const currentPreset = PRESETS[presetName];
  const is6String = currentPreset.strings.length === 6;
  const pegCoordinates = is6String ? PEGS_GUITAR : PEGS_4STRING;

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasChimedRef = useRef(false);

  // Keep state refs up to date for the worker message event handler
  const autoModeRef = useRef(autoMode);
  const activeStringIndexRef = useRef(activeStringIndex);
  const currentPresetRef = useRef(currentPreset);

  useEffect(() => {
    autoModeRef.current = autoMode;
    activeStringIndexRef.current = activeStringIndex;
    currentPresetRef.current = currentPreset;
  }, [autoMode, activeStringIndex, currentPreset]);

  // When changing instruments or tuning presets, reset states
  useEffect(() => {
    setActiveStringIndex(0);
    setFreq(0);
    setCents(0);
    setNoteName("—");
    setTargetFreq(0);
    setIsPerfect(false);
    hasChimedRef.current = false;
  }, [presetName]);

  async function start() {
    setPermError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const worker = new Worker(new URL("../lib/yin.worker.ts", import.meta.url), {
        type: "module",
      });
      workerRef.current = worker;
      let pending = false;

      worker.onmessage = (e: MessageEvent<{ freq: number }>) => {
        pending = false;
        const f = e.data.freq;
        if (f > 35 && f < 1500) {
          const detectedMidi = freqToMidi(f);
          const preset = currentPresetRef.current;

          if (autoModeRef.current) {
            // Auto mode: find the closest preset string pitch
            let closestIdx = 0;
            let minDiff = Infinity;
            preset.strings.forEach((str, idx) => {
              const diff = Math.abs(detectedMidi - str.midi);
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
              }
            });

            // Snapped target string
            const targetStr = preset.strings[closestIdx];
            const targetF = midiToFreq(targetStr.midi);
            const c = Math.round(1200 * Math.log2(f / targetF));

            // Only update active index if the pitch is reasonably close (within 2.5 semitones)
            if (Math.abs(detectedMidi - targetStr.midi) < 2.5) {
              setActiveStringIndex(closestIdx);
              setFreq(f);
              setNoteName(targetStr.name);
              setCents(Math.max(-50, Math.min(50, c)));
              setTargetFreq(targetF);

              const checkPerfect = Math.abs(c) <= 3;
              setIsPerfect(checkPerfect);
              if (checkPerfect) {
                if (!hasChimedRef.current) {
                  playInTuneChime();
                  hasChimedRef.current = true;
                }
              } else {
                hasChimedRef.current = false;
              }
            }
          } else {
            // Manual mode: lock pitch detection to selected active peg
            const targetStr = preset.strings[activeStringIndexRef.current];
            const targetF = midiToFreq(targetStr.midi);
            const c = Math.round(1200 * Math.log2(f / targetF));

            // Only show reading if detected pitch is close to manual peg
            if (Math.abs(detectedMidi - targetStr.midi) < 2.5) {
              setFreq(f);
              setNoteName(targetStr.name);
              setCents(Math.max(-50, Math.min(50, c)));
              setTargetFreq(targetF);

              const checkPerfect = Math.abs(c) <= 3;
              setIsPerfect(checkPerfect);
              if (checkPerfect) {
                if (!hasChimedRef.current) {
                  playInTuneChime();
                  hasChimedRef.current = true;
                }
              } else {
                hasChimedRef.current = false;
              }
            } else {
              // Out of range for selected manual string
              setFreq(0);
              setCents(0);
              setIsPerfect(false);
              hasChimedRef.current = false;
            }
          }
        }
      };

      const buf = new Float32Array(analyser.fftSize);
      let silenceFrames = 0;

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);

        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);

        if (rms > 0.012) {
          silenceFrames = 0;
          if (!pending && workerRef.current) {
            pending = true;
            workerRef.current.postMessage({
              buffer: buf.slice(0),
              sampleRate: ctxRef.current!.sampleRate,
            });
          }
        } else {
          silenceFrames++;
          if (silenceFrames > 35) { // Return needle to center and fade out detected pitch
            setFreq(0);
            setCents(0);
            setIsPerfect(false);
            hasChimedRef.current = false;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setListening(true);
    } catch (err) {
      setPermError(err instanceof Error ? err.message : "Mic access denied");
    }
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    workerRef.current?.terminate();
    ctxRef.current?.close();
    streamRef.current = null;
    workerRef.current = null;
    ctxRef.current = null;
    analyserRef.current = null;
    setListening(false);
    setFreq(0);
    setCents(0);
    setNoteName("—");
    setTargetFreq(0);
    setIsPerfect(false);
    hasChimedRef.current = false;
  }

  useEffect(() => () => stop(), []);

  // Handle peg clicking
  function handlePegClick(index: number) {
    const string = currentPreset.strings[index];
    playSingleGuitarNote(string.midi);
    setActiveStringIndex(index);
    hasChimedRef.current = false;

    if (autoMode) {
      setAutoMode(false);
    }
  }

  // Calculate meter needle percentage (-50 to +50 cents maps to 5% to 95%)
  const meterPos = 50 + (cents / 50) * 45;
  const inTuneRange = Math.abs(cents) <= 3;
  const closeRange = Math.abs(cents) <= 12;

  return (
    <div className="min-h-screen bg-[#0f1115] text-foreground flex flex-col justify-between overflow-hidden">
      <Navbar />

      {/* Main viewport-fitting, non-scrolling single column container */}
      <main className="flex-1 flex flex-col justify-between max-w-md w-full mx-auto px-4 py-3 h-[calc(100vh-4rem)]">
        
        {/* Header Controls (Compact row matching GuitarTuna app header style) */}
        <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-900">
          {/* Custom Select dropdown for instrument presets */}
          <div className="relative flex-1 max-w-[170px]">
            <select
              value={presetName}
              onChange={(e) => setPresetName(e.target.value as PresetName)}
              className="w-full bg-[#181d26] text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold select-none outline-none appearance-none cursor-pointer pr-8 shadow-sm"
            >
              {(Object.keys(PRESETS) as PresetName[]).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Compact Pill Toggle for AUTO / MANUAL */}
          <div className="flex bg-[#181d26] rounded-xl p-0.5 border border-slate-800 shadow-sm w-36">
            <button
              onClick={() => setAutoMode(true)}
              className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition duration-150 ${
                autoMode
                  ? "bg-emerald-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              AUTO
            </button>
            <button
              onClick={() => {
                setAutoMode(false);
                hasChimedRef.current = false;
              }}
              className={`flex-1 text-center py-1.5 text-[10px] font-bold rounded-lg transition duration-150 ${
                !autoMode
                  ? "bg-emerald-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              MANUAL
            </button>
          </div>
        </div>

        {/* Cents Needle Meter Card (Upper Center of viewport) */}
        <div className="bg-[#141820]/90 border border-slate-900 rounded-2xl p-4 shadow-md relative overflow-hidden flex flex-col gap-2 my-2">
          {/* In-tune soft green flash background */}
          {inTuneRange && freq > 0 && (
            <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none transition duration-500 animate-pulse" />
          )}

          {/* Tuning linear scale */}
          <div className="relative h-10 bg-[#0c0f14] rounded-xl border border-slate-950 flex items-center">
            
            {/* Center target line */}
            <div className={`absolute left-1/2 -translate-x-1/2 h-full w-[2px] z-10 transition duration-200 ${
              inTuneRange && freq > 0 ? "bg-emerald-400 shadow-[0_0_10px_#10b981]" : "bg-slate-800"
            }`} />

            {/* Scale background ticks line */}
            <div className="absolute left-4 right-4 h-[1px] bg-slate-900/60 flex justify-between items-center">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={`w-[1px] ${i === 4 ? "h-3 bg-slate-600" : i % 2 === 0 ? "h-2 bg-slate-800" : "h-1 bg-slate-800/60"}`} />
              ))}
            </div>

            {/* Sliding cursor / needle */}
            {freq > 0 && (
              <div
                className={`absolute -translate-x-1/2 top-1 bottom-1 w-[4px] rounded-full transition-all duration-75 ease-out z-20 ${
                  inTuneRange
                    ? "bg-emerald-400 shadow-[0_0_12px_#10b981] scale-y-110"
                    : closeRange
                    ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                    : "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                }`}
                style={{ left: `${meterPos}%` }}
              />
            )}
            
            {/* Limit labels */}
            <span className="absolute left-2 text-[9px] font-bold text-slate-600">TOO LOW</span>
            <span className="absolute right-2 text-[9px] font-bold text-slate-600">TOO HIGH</span>
          </div>

          {/* Central Circular Display & Info */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              {/* Massive note bubble (Signature of GuitarTuna) */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border font-display text-2xl font-black transition duration-200 shadow-md ${
                freq > 0
                  ? inTuneRange
                    ? "bg-emerald-950/30 text-emerald-400 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : closeRange
                    ? "bg-amber-950/10 text-amber-400 border-amber-500/40"
                    : "bg-rose-950/10 text-rose-400 border-rose-500/40"
                  : "bg-[#181d26] text-slate-600 border-slate-800"
              }`}>
                {freq > 0 ? noteName : "—"}
              </div>

              <div>
                <h3 className={`text-sm font-bold tracking-wide leading-none ${
                  freq > 0
                    ? inTuneRange
                      ? "text-emerald-400 animate-pulse"
                      : cents < 0 ? "text-amber-400" : "text-rose-400"
                    : "text-slate-400"
                }`}>
                  {freq > 0
                    ? inTuneRange
                      ? "IN TUNE!"
                      : cents < 0 ? "Flat" : "Sharp"
                    : listening
                    ? "Pluck a string..."
                    : "Tuner offline"}
                </h3>
                <span className="text-[10px] text-slate-500 block mt-1">
                  {freq > 0 ? `${freq.toFixed(1)} Hz` : "Mic listening for pitch"}
                </span>
              </div>
            </div>

            {/* Cents numerical difference display */}
            <div>
              {freq > 0 && (
                <div className={`font-display font-extrabold text-xl ${
                  inTuneRange ? "text-emerald-400" : "text-slate-300"
                }`}>
                  {cents > 0 ? `+${cents}` : cents}
                  <span className="text-xs font-normal text-slate-500 ml-0.5">¢</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stylized Guitar Headstock container (Fills the main vertical viewport) */}
        <div className="flex-1 flex items-center justify-center py-2 relative min-h-[300px]">
          <div className="relative w-[260px] h-[320px] select-none">
            
            {/* SVG Headstock Drawing */}
            <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" viewBox="0 0 260 320">
              {/* Neck segment extending up from bottom */}
              <path
                d="M 105 320 L 115 250 L 145 250 L 155 320 Z"
                fill="#151922"
                stroke="#1f2635"
                strokeWidth="1.5"
              />
              {/* White Nut line */}
              <line x1="115" y1="250" x2="145" y2="250" stroke="#cbd5e1" strokeWidth="3.5" />

              {/* Headstock body panel */}
              <path
                d="M 90 250 L 90 230 Q 80 220 80 190 L 80 50 Q 80 20 130 10 Q 180 20 180 50 L 180 190 Q 180 220 170 230 L 170 250 Z"
                fill="#1a1f2c"
                stroke="#2a3348"
                strokeWidth="2"
              />
              
              {/* Dark accent center strip */}
              <path d="M 120 20 L 120 250" stroke="#10141d" strokeWidth="2.5" />
              <path d="M 140 20 L 140 250" stroke="#10141d" strokeWidth="2.5" />

              {/* Peg posts and connector pegs */}
              {currentPreset.strings.map((str, idx) => {
                const coord = pegCoordinates[idx];
                if (!coord) return null;
                const isLeft = !!coord.left;
                const topVal = parseInt(coord.top);
                const pegX = isLeft ? 95 : 165;
                const pegY = topVal + 20; // Peg button center y coordinate

                return (
                  <g key={idx}>
                    {/* Peg posts on wood panel */}
                    <circle cx={pegX} cy={pegY} r="4.5" fill="#64748b" stroke="#334155" strokeWidth="1" />
                    <circle cx={pegX} cy={pegY} r="1.5" fill="#cbd5e1" />
                    
                    {/* Connection lines from post to side buttons */}
                    <line
                      x1={pegX}
                      y1={pegY}
                      x2={isLeft ? 40 : 220}
                      y2={pegY}
                      stroke="#475569"
                      strokeWidth="2.5"
                    />
                  </g>
                );
              })}

              {/* Physical strings drawn stretching from nut to the peg posts */}
              {currentPreset.strings.map((str, idx) => {
                const coord = pegCoordinates[idx];
                if (!coord) return null;
                const isLeft = !!coord.left;
                const topVal = parseInt(coord.top);
                const pegX = isLeft ? 95 : 165;
                const pegY = topVal + 20;
                
                // Nut string guides layout
                const nutX = 117 + (idx * 5.2); 
                const isActive = activeStringIndex === idx && freq > 0;

                return (
                  <path
                    key={idx}
                    d={`M ${nutX} 250 L ${nutX} 230 L ${pegX} ${pegY}`}
                    fill="none"
                    stroke={
                      isActive
                        ? inTuneRange
                          ? "#10b981"
                          : "#f59e0b"
                        : "#2d3748"
                    }
                    strokeWidth={isActive ? "2.2" : "1"}
                    className="transition-colors duration-150"
                    style={{
                      filter: isActive 
                        ? `drop-shadow(0 0 3px ${inTuneRange ? "#10b981" : "#f59e0b"})` 
                        : "none"
                    }}
                  />
                );
              })}
            </svg>

            {/* Big, thumb-friendly Peg buttons placed around the SVG */}
            {currentPreset.strings.map((str, idx) => {
              const coord = pegCoordinates[idx];
              if (!coord) return null;
              
              const isSelected = activeStringIndex === idx;
              const hasSignal = isSelected && freq > 0;
              
              let pegColorClass = "border-slate-800 bg-[#141820]/90 text-slate-400 hover:border-slate-700 hover:text-slate-200";
              if (isSelected && !autoMode) {
                pegColorClass = "border-cyan-500 bg-cyan-950/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]";
              }
              if (hasSignal) {
                pegColorClass = inTuneRange
                  ? "border-emerald-500 bg-emerald-950/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                  : closeRange
                  ? "border-amber-500 bg-amber-950/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]"
                  : "border-rose-500 bg-rose-950/20 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)]";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handlePegClick(idx)}
                  className={`absolute w-11 h-11 rounded-full border-2 flex flex-col items-center justify-center transition duration-200 z-10 font-bold outline-none cursor-pointer select-none active:scale-95 ${pegColorClass}`}
                  style={{
                    left: coord.left,
                    right: coord.right,
                    top: coord.top,
                  }}
                >
                  <span className="text-xs tracking-tighter leading-none">{str.name}</span>
                  <span className="text-[7px] opacity-60 leading-none">{str.note}</span>

                  {/* Micro checkmark overlay when correctly tuned */}
                  {hasSignal && inTuneRange && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border border-[#0f1115] flex items-center justify-center text-[7px] text-slate-950 font-black">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer (Start / Stop button and permission alert) */}
        <div className="py-2">
          <button
            onClick={listening ? stop : start}
            className={`w-full py-3.5 rounded-xl font-bold transition duration-300 shadow flex items-center justify-center gap-2.5 text-xs tracking-wider ${
              listening
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 active:scale-95"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            }`}
          >
            {listening ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                <span>STOP TUNER</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                  <path d="M19 10v1a7 7 0 01-14 0v-1H3v1a9 9 0 008 8.94V21H9v2h6v-2h-2v-2.06A9 9 0 0021 11v-1h-2z" />
                </svg>
                <span>START MIC TUNER</span>
              </>
            )}
          </button>
          {permError && (
            <p className="text-[10px] text-rose-400 text-center mt-2 font-medium bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg">
              ⚠ Mic Access: {permError}
            </p>
          )}
        </div>

      </main>
    </div>
  );
}
