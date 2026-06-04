import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/metronome")({
  head: () => ({
    meta: [
      { title: "Metronome — MusicKit" },
      { name: "description", content: "Sample-accurate metronome powered by Web Audio." },
    ],
  }),
  component: MetronomePage,
});

const SIGNATURES = [
  { label: "4/4", beats: 4 },
  { label: "3/4", beats: 3 },
  { label: "6/8", beats: 6 },
  { label: "5/4", beats: 5 },
  { label: "7/8", beats: 7 },
];
const SUBDIVISIONS = [
  { label: "Quarter", n: 1 },
  { label: "Eighth", n: 2 },
  { label: "Triplet", n: 3 },
  { label: "Sixteenth", n: 4 },
];

function MetronomePage() {
  const [bpm, setBpm] = useState(120);
  const [sig, setSig] = useState(SIGNATURES[0]);
  const [sub, setSub] = useState(SUBDIVISIONS[0]);
  const [running, setRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const beatRef = useRef(0);
  const tickRef = useRef(0);
  const lookaheadTimerRef = useRef<number | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  const scheduleAheadTime = 0.1;
  const lookahead = 25;

  function scheduleClick(time: number, isAccent: boolean, isSub: boolean) {
    const ctx = audioCtxRef.current!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.value = isAccent ? 1500 : isSub ? 600 : 1000;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(isSub ? 0.3 : 0.8, time + 0.001);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    osc.connect(env).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.07);
  }

  function scheduler() {
    const ctx = audioCtxRef.current!;
    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const isSubTick = tickRef.current % sub.n !== 0;
      const isAccent = !isSubTick && beatRef.current === 0;
      scheduleClick(nextNoteTimeRef.current, isAccent, isSubTick);

      if (!isSubTick) {
        const beatToShow = beatRef.current;
        const showAt = nextNoteTimeRef.current;
        const delay = Math.max(0, (showAt - ctx.currentTime) * 1000);
        setTimeout(() => setCurrentBeat(beatToShow), delay);
      }

      const secondsPerBeat = 60.0 / bpm;
      nextNoteTimeRef.current += secondsPerBeat / sub.n;
      tickRef.current++;
      if (tickRef.current % sub.n === 0) {
        beatRef.current = (beatRef.current + 1) % sig.beats;
      }
    }
  }

  function start() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    audioCtxRef.current.resume();
    beatRef.current = 0;
    tickRef.current = 0;
    nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
    setRunning(true);
    lookaheadTimerRef.current = window.setInterval(scheduler, lookahead);
  }
  function stop() {
    setRunning(false);
    if (lookaheadTimerRef.current) window.clearInterval(lookaheadTimerRef.current);
    lookaheadTimerRef.current = null;
    setCurrentBeat(0);
  }
  useEffect(() => () => { if (lookaheadTimerRef.current) window.clearInterval(lookaheadTimerRef.current); }, []);
  useEffect(() => {
    if (running) { stop(); start(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, sig, sub]);

  function tapTempo() {
    const now = performance.now();
    tapTimesRef.current = [...tapTimesRef.current.filter((t) => now - t < 2000), now];
    if (tapTimesRef.current.length >= 2) {
      const intervals = tapTimesRef.current.slice(1).map((t, i) => t - tapTimesRef.current[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tapped = Math.round(60000 / avg);
      if (tapped >= 20 && tapped <= 300) setBpm(tapped);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-accent text-sm font-semibold tracking-widest mb-2">02 — METRONOME</p>
          <h1 className="text-5xl md:text-6xl font-display">Keep Perfect Time</h1>
        </div>

        <div className="rounded-3xl bg-card/60 backdrop-blur border border-border p-8 md:p-12">
          {/* BPM */}
          <div className="text-center mb-8">
            <div className="font-display text-8xl md:text-9xl bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              {bpm}
            </div>
            <div className="text-muted-foreground text-sm tracking-widest -mt-2">BEATS PER MINUTE</div>
          </div>

          {/* Beat dots */}
          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {Array.from({ length: sig.beats }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full transition-all duration-75 ${
                  running && currentBeat === i
                    ? i === 0
                      ? "bg-accent scale-150 shadow-[0_0_25px_oklch(0.7_0.22_340)]"
                      : "bg-primary scale-150 shadow-[0_0_20px_oklch(0.82_0.17_80)]"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* BPM controls */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <button onClick={() => setBpm((b) => Math.max(20, b - 1))} className="w-11 h-11 rounded-full bg-muted hover:bg-secondary transition text-xl">−</button>
            <input
              type="number" min={20} max={300} value={bpm}
              onChange={(e) => setBpm(Math.min(300, Math.max(20, Number(e.target.value) || 120)))}
              className="w-24 text-center px-3 py-2 rounded-xl bg-input border border-border text-lg"
            />
            <button onClick={() => setBpm((b) => Math.min(300, b + 1))} className="w-11 h-11 rounded-full bg-muted hover:bg-secondary transition text-xl">+</button>
          </div>
          <input
            type="range" min={20} max={300} value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full accent-primary mb-8"
          />

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            <button
              onClick={running ? stop : start}
              className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold animate-pulse-glow hover:scale-105 transition"
            >
              {running ? "■ Stop" : "▶ Start"}
            </button>
            <button onClick={tapTempo} className="px-6 py-3 rounded-full border border-border hover:border-primary transition font-semibold">
              Tap Tempo
            </button>
          </div>

          {/* Signature & subdivisions */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-muted-foreground text-xs tracking-widest mb-2">TIME SIGNATURE</div>
              <div className="flex flex-wrap gap-2">
                {SIGNATURES.map((s) => (
                  <button key={s.label} onClick={() => setSig(s)} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${sig.label === s.label ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-secondary"}`}>{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs tracking-widest mb-2">SUBDIVISIONS</div>
              <div className="flex flex-wrap gap-2">
                {SUBDIVISIONS.map((s) => (
                  <button key={s.label} onClick={() => setSub(s)} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${sub.label === s.label ? "bg-accent text-accent-foreground" : "bg-muted hover:bg-secondary"}`}>{s.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
