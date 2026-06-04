import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { midiToFreq, freqToMidi, midiToNoteName } from "@/lib/chordEngine";

export const Route = createFileRoute("/tuner")({
  head: () => ({
    meta: [
      { title: "Guitar Tuner — MeloFY" },
      { name: "description", content: "Chromatic tuner with YIN pitch detection." },
    ],
  }),
  component: TunerPage,
});

const TUNINGS = {
  Standard: ["E2", "A2", "D3", "G3", "B3", "E4"],
  "Drop D": ["D2", "A2", "D3", "G3", "B3", "E4"],
  "Open G": ["D2", "G2", "D3", "G3", "B3", "D4"],
};
type TuningName = keyof typeof TUNINGS;

function noteNameToMidi(name: string): number {
  const m = name.match(/^([A-G])(#|b)?(-?\d+)$/);
  if (!m) return 60;
  const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  let n = m[1];
  if (m[2] === "#") n += "#";
  if (m[2] === "b") {
    const flatMap: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
    n = flatMap[m[1] + "b"] ?? n;
  }
  const idx = NOTES.indexOf(n);
  return (Number(m[3]) + 1) * 12 + idx;
}

function TunerPage() {
  const [tuning, setTuning] = useState<TuningName>("Standard");
  const [listening, setListening] = useState(false);
  const [permError, setPermError] = useState("");
  const [freq, setFreq] = useState(0);
  const [note, setNote] = useState("—");
  const [cents, setCents] = useState(0);
  const [targetFreq, setTargetFreq] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);

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
        if (f > 50 && f < 2000) {
          setFreq(f);
          const midi = freqToMidi(f);
          const rounded = Math.round(midi);
          const target = midiToFreq(rounded);
          const c = Math.round(1200 * Math.log2(f / target));
          setNote(midiToNoteName(rounded));
          setCents(Math.max(-50, Math.min(50, c)));
          setTargetFreq(target);
        }
      };

      const buf = new Float32Array(analyser.fftSize);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);
        // RMS gate
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);
        if (rms > 0.01 && !pending && workerRef.current) {
          pending = true;
          workerRef.current.postMessage({
            buffer: buf.slice(0),
            sampleRate: ctxRef.current!.sampleRate,
          });
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
    setNote("—");
    setCents(0);
  }

  useEffect(() => () => stop(), []);

  const tuneColor =
    Math.abs(cents) <= 5
      ? "oklch(0.75 0.2 140)"
      : Math.abs(cents) <= 15
        ? "oklch(0.82 0.17 80)"
        : "oklch(0.65 0.25 30)";
  const needleAngle = (cents / 50) * 45; // -45° to +45°

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-accent text-sm font-semibold tracking-widest mb-2">03 — TUNER</p>
          <h1 className="text-5xl md:text-6xl font-display">Chromatic Tuner</h1>
          <p className="text-muted-foreground mt-3">YIN pitch detection running in a Web Worker.</p>
        </div>

        <div className="rounded-3xl bg-card/60 backdrop-blur border border-border p-8 md:p-12">
          {/* Meter */}
          <div className="relative aspect-[2/1] max-w-2xl mx-auto mb-8">
            <svg viewBox="0 0 400 200" className="w-full h-full">
              {/* Arc */}
              <path
                d="M 40 180 A 160 160 0 0 1 360 180"
                fill="none"
                stroke="oklch(0.3 0.06 290)"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M 40 180 A 160 160 0 0 1 360 180"
                fill="none"
                stroke="url(#grad)"
                strokeWidth="2"
              />
              <defs>
                <linearGradient id="grad" x1="0" x2="1">
                  <stop offset="0" stopColor="oklch(0.65 0.25 30)" />
                  <stop offset="0.5" stopColor="oklch(0.75 0.2 140)" />
                  <stop offset="1" stopColor="oklch(0.65 0.25 30)" />
                </linearGradient>
              </defs>
              {/* Tick marks */}
              {[-45, -22.5, 0, 22.5, 45].map((a) => {
                const rad = ((a - 90) * Math.PI) / 180;
                const x1 = 200 + Math.cos(rad) * 145;
                const y1 = 180 + Math.sin(rad) * 145;
                const x2 = 200 + Math.cos(rad) * 165;
                const y2 = 180 + Math.sin(rad) * 165;
                return (
                  <line
                    key={a}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="oklch(0.7 0.04 90)"
                    strokeWidth="2"
                  />
                );
              })}
              <text x="40" y="195" fill="oklch(0.72 0.04 90)" fontSize="12">
                -50¢
              </text>
              <text x="195" y="195" fill="oklch(0.72 0.04 90)" fontSize="12" textAnchor="middle">
                0
              </text>
              <text x="360" y="195" fill="oklch(0.72 0.04 90)" fontSize="12" textAnchor="end">
                +50¢
              </text>
              {/* Needle */}
              <line
                x1="200"
                y1="180"
                x2={200 + Math.cos(((needleAngle - 90) * Math.PI) / 180) * 140}
                y2={180 + Math.sin(((needleAngle - 90) * Math.PI) / 180) * 140}
                stroke={tuneColor}
                strokeWidth="4"
                strokeLinecap="round"
                style={{ transition: "all 0.1s ease-out" }}
              />
              <circle cx="200" cy="180" r="10" fill={tuneColor} />
            </svg>
          </div>

          {/* Readouts */}
          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div>
              <div className="text-muted-foreground text-xs tracking-widest">NOTE</div>
              <div className="font-display text-5xl" style={{ color: tuneColor }}>
                {note}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs tracking-widest">FREQUENCY</div>
              <div className="font-display text-5xl">
                {freq ? freq.toFixed(1) : "—"}
                <span className="text-xl text-muted-foreground"> Hz</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs tracking-widest">CENTS</div>
              <div className="font-display text-5xl" style={{ color: tuneColor }}>
                {cents > 0 ? "+" : ""}
                {cents}
              </div>
            </div>
          </div>

          {/* Mic button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={listening ? stop : start}
              className={`px-8 py-3 rounded-full font-semibold transition hover:scale-105 ${listening ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground animate-pulse-glow"}`}
            >
              {listening ? "■ Stop listening" : "🎤 Start tuner"}
            </button>
          </div>
          {permError && <p className="text-destructive text-center mb-6">⚠ {permError}</p>}

          {/* Tuning preset */}
          <div>
            <div className="text-muted-foreground text-xs tracking-widest mb-2 text-center">
              TUNING PRESET
            </div>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {(Object.keys(TUNINGS) as TuningName[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTuning(t)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tuning === t ? "bg-accent text-accent-foreground" : "bg-muted hover:bg-secondary"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {TUNINGS[tuning].map((n, i) => {
                const midi = noteNameToMidi(n);
                const f = midiToFreq(midi);
                const isMatch = note === n && Math.abs(cents) <= 5;
                return (
                  <div
                    key={i}
                    className={`px-4 py-3 rounded-xl border text-center transition ${isMatch ? "border-primary bg-primary/20 shadow-[0_0_20px_oklch(0.82_0.17_80/0.4)]" : "border-border bg-card/40"}`}
                  >
                    <div className="font-display text-xl">{n}</div>
                    <div className="text-xs text-muted-foreground">{f.toFixed(1)} Hz</div>
                  </div>
                );
              })}
            </div>
            {targetFreq > 0 && (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Target: {targetFreq.toFixed(1)} Hz
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
