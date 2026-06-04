import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MusicVisualizer } from "../components/MusicVisualizer";
import { toast } from "sonner";
import { Music } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MeloFY" },
      {
        name: "description",
        content:
          "Chord diagrams, metronome, tuner, and practice tracker. Built for musicians who play.",
      },
      { property: "og:title", content: "MeloFY — Tools for Musicians" },
      {
        property: "og:description",
        content: "Chords, metronome, tuner & practice tracking in one beautiful app.",
      },
    ],
  }),
  component: Index,
});

function Equalizer({ bars = 5, className = "" }: { bars?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-1 h-8 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => {
        const delay = Math.round(i * 0.15 * 100) / 100;
        const duration = Math.round((0.8 + (i % 3) * 0.2) * 100) / 100;
        return (
          <span
            key={i}
            className="w-1 bg-gradient-to-t from-primary to-accent rounded-full origin-bottom animate-equalize"
            style={{
              height: "100%",
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}

function FloatingNotes() {
  const notes = ["♪", "♫", "♬", "♩", "𝄞"];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 14 }).map((_, i) => {
        const left = Math.round(((i * 7.3) % 100) * 100) / 100;
        const delay = Math.round(((i * 0.7) % 6) * 100) / 100;
        const duration = 5 + (i % 4);
        return (
          <span
            key={i}
            className="absolute text-2xl md:text-4xl text-primary/30 animate-float-note"
            style={{
              left: `${left}%`,
              bottom: "-40px",
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {notes[i % notes.length]}
          </span>
        );
      })}
    </div>
  );
}

function Waveform() {
  return (
    <svg viewBox="0 0 400 80" className="w-full h-16">
      {Array.from({ length: 60 }).map((_, i) => {
        const rawH = 10 + Math.abs(Math.sin(i * 0.4)) * 50 + (i % 5) * 3;
        const h = Math.round(rawH * 100) / 100;
        const y = Math.round((40 - h / 2) * 100) / 100;
        const delay = Math.round(i * 0.05 * 100) / 100;
        const duration = Math.round((1 + (i % 3) * 0.3) * 100) / 100;
        return (
          <rect
            key={i}
            x={i * 7}
            y={y}
            width="3"
            height={h}
            rx="1.5"
            className="fill-primary animate-equalize origin-center"
            style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
          />
        );
      })}
    </svg>
  );
}

function ChordDiagram({ name, frets }: { name: string; frets: (number | "x")[] }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card/60 backdrop-blur border border-border hover:border-primary/50 transition-all hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_oklch(0.82_0.17_80/0.4)]">
      <div className="text-2xl font-display">{name}</div>
      <svg viewBox="0 0 100 110" className="w-20 h-24">
        <rect
          x="10"
          y="15"
          width="80"
          height="80"
          fill="oklch(0.97 0.02 90 / 0.05)"
          stroke="oklch(0.82 0.17 80)"
          strokeWidth="1.5"
        />
        {[1, 2, 3, 4].map((i) => (
          <line
            key={`h${i}`}
            x1="10"
            y1={15 + i * 20}
            x2="90"
            y2={15 + i * 20}
            stroke="oklch(0.82 0.17 80 / 0.6)"
            strokeWidth="0.8"
          />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line
            key={`v${i}`}
            x1={10 + i * 16}
            y1="15"
            x2={10 + i * 16}
            y2="95"
            stroke="oklch(0.82 0.17 80 / 0.6)"
            strokeWidth="0.8"
          />
        ))}
        {frets.map((f, i) => {
          const x = 10 + i * 16;
          if (f === "x")
            return (
              <text
                key={i}
                x={x}
                y="10"
                textAnchor="middle"
                className="fill-destructive"
                fontSize="8"
              >
                ×
              </text>
            );
          if (f === 0)
            return (
              <circle
                key={i}
                cx={x}
                cy="8"
                r="2.5"
                fill="none"
                stroke="oklch(0.97 0.02 90)"
                strokeWidth="1"
              />
            );
          return <circle key={i} cx={x} cy={5 + f * 20} r="4" className="fill-accent" />;
        })}
      </svg>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function Index() {
  const [bpm, setBpm] = useState(120);
  const [beat, setBeat] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall as EventListener);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall as EventListener);
    };
  }, []);

  const handleInstall = async () => {
    const { playInstallSound } = await import("../lib/audioSynth");
    playInstallSound();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as Window & { MSStream?: unknown }).MSStream;
      if (isIOS) {
        toast.info(
          "To install MeloFY on iOS: tap the 'Share' icon in Safari and select 'Add to Home Screen' 📲",
        );
      } else {
        toast.info(
          "MeloFY PWA installation: look for the install button in your browser's address bar! 🚀",
        );
      }
    }
  };

  useEffect(() => {
    const interval = (60 / bpm) * 1000;
    const id = setInterval(() => setBeat((b) => (b + 1) % 4), interval);
    return () => clearInterval(id);
  }, [bpm]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* NAV */}
      <header className="relative z-20 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center animate-vinyl-spin">
            <div className="w-2 h-2 rounded-full bg-accent" />
          </div>
          <span className="font-display text-2xl tracking-wider">MELOFY</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link to="/chords" className="hover:text-primary transition">
            Chords
          </Link>
          <Link to="/metronome" className="hover:text-primary transition">
            Metronome
          </Link>
          <Link to="/tuner" className="hover:text-primary transition">
            Tuner
          </Link>
          <Link to="/dashboard" className="hover:text-primary transition">
            Dashboard
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {!isInstalled && (
            <button
              onClick={handleInstall}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-accent-foreground bg-gradient-to-r from-accent via-primary to-accent animate-pulse-glow hover:scale-105 active:scale-95 transition shadow-[0_0_15px_oklch(0.7_0.22_340/0.45)] border border-accent/35"
            >
              <Music className="w-3.5 h-3.5 text-accent-foreground animate-bounce" />
              <span>Install</span>
            </button>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-6 md:px-12 pt-6 sm:pt-12 pb-24">
        <FloatingNotes />
        <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="space-y-6 flex flex-col items-center text-center md:items-start md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-xs text-accent">
              <Equalizer bars={3} className="h-3" />
              Now in tune
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-display leading-[0.9] text-center md:text-left">
              Play it.
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Tune it.
              </span>
              <br />
              Master it.
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md">
              Four essential tools for every musician — chord library, metronome, chromatic tuner,
              and practice journal. One beautiful app.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 justify-center md:justify-start w-full">
              <Link
                to="/chords"
                className="group px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold animate-pulse-glow hover:scale-105 transition inline-flex items-center gap-2"
              >
                ▶ Start playing
              </Link>
              <Link
                to="/metronome"
                className="px-7 py-3 rounded-full border border-border hover:border-primary transition font-semibold"
              >
                Open metronome
              </Link>
            </div>
          </div>

          {/* HERO VISUAL: MusicVisualizer */}
          <div className="w-full max-w-[300px] sm:max-w-[380px] md:max-w-[440px] mx-auto">
            <MusicVisualizer />
          </div>
        </div>

        {/* MARQUEE */}
        <div className="mt-24 overflow-hidden border-y border-border py-4">
          <div className="flex gap-12 animate-marquee whitespace-nowrap font-display text-3xl text-muted-foreground/60">
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-12">
                {[
                  "CHORDS",
                  "♪",
                  "METRONOME",
                  "♫",
                  "TUNER",
                  "♬",
                  "PRACTICE",
                  "♩",
                  "RHYTHM",
                  "𝄞",
                  "MELODY",
                  "♪",
                ].map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHORDS */}
      <section id="chords" className="relative z-10 px-6 md:px-12 py-24 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
          <div>
            <p className="text-accent text-sm font-semibold tracking-widest mb-2">01 — CHORDS</p>
            <h2 className="text-5xl md:text-6xl font-display">A library at your fingertips.</h2>
          </div>
          <p className="text-muted-foreground max-w-sm">
            Search any chord and instantly see fingerings, fret positions, and alternates.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ChordDiagram name="Cmaj7" frets={["x", 3, 2, 0, 0, 0]} />
          <ChordDiagram name="Am" frets={["x", 0, 2, 2, 1, 0]} />
          <ChordDiagram name="G" frets={[3, 2, 0, 0, 0, 3]} />
          <ChordDiagram name="Dsus4" frets={["x", "x", 0, 2, 3, 3]} />
        </div>
      </section>

      {/* METRONOME */}
      <section id="metronome" className="relative z-10 px-6 md:px-12 py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <p className="text-accent text-sm font-semibold tracking-widest">02 — METRONOME</p>
            <h2 className="text-5xl md:text-6xl font-display">Keep perfect time.</h2>
            <p className="text-muted-foreground">
              Sample-accurate timing powered by Web Audio. Tap tempo, custom subdivisions, and
              visual beat indicators.
            </p>
          </div>
          <div className="rounded-3xl bg-card/80 backdrop-blur border border-border p-10 shadow-2xl">
            <div className="text-center">
              <div className="font-display text-8xl bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                {bpm}
              </div>
              <div className="text-muted-foreground text-sm tracking-widest mb-6">BPM</div>
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-100 ${
                      beat === i
                        ? "bg-primary scale-150 shadow-[0_0_20px_oklch(0.82_0.17_80)]"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <input
                type="range"
                min={40}
                max={240}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* TUNER */}
      <section id="tuner" className="relative z-10 px-6 md:px-12 py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="md:order-2 space-y-6">
            <p className="text-accent text-sm font-semibold tracking-widest">03 — TUNER</p>
            <h2 className="text-5xl md:text-6xl font-display">Pitch perfect, instantly.</h2>
            <p className="text-muted-foreground">
              Chromatic tuner with YIN pitch detection running in a Web Worker — never blocks your
              sound.
            </p>
          </div>
          <div className="md:order-1 rounded-3xl bg-card/80 backdrop-blur border border-border p-10 shadow-2xl">
            <Waveform />
            <div className="mt-6 flex items-center justify-between">
              <div>
                <div className="text-muted-foreground text-xs tracking-widest">DETECTED</div>
                <div className="font-display text-5xl">
                  A<span className="text-accent">4</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground text-xs tracking-widest">CENTS</div>
                <div className="font-display text-5xl text-primary">+2</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRACTICE / CTA */}
      <section id="practice" className="relative z-10 px-6 md:px-12 py-24">
        <div className="max-w-4xl mx-auto text-center rounded-3xl bg-gradient-to-br from-accent/20 via-primary/10 to-transparent border border-accent/30 p-12 md:p-20 relative overflow-hidden">
          <FloatingNotes />
          <p className="text-accent text-sm font-semibold tracking-widest mb-4 relative">
            04 — PRACTICE
          </p>
          <h2 className="text-5xl md:text-7xl font-display mb-6 relative">
            Every session,
            <br />
            <span className="italic">remembered.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 relative">
            Save chords, export PDFs of your favorites, and track every practice session in your
            personal dashboard.
          </p>
          <button className="relative px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold animate-pulse-glow hover:scale-105 transition">
            Get started — free
          </button>
        </div>
      </section>

      <footer className="relative z-10 px-6 md:px-12 py-10 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center animate-vinyl-spin">
              <div className="w-1 h-1 rounded-full bg-accent" />
            </div>
            <span className="font-display tracking-wider">MELOFY</span>
          </div>
          <div>© 2026 — Built for musicians who play.</div>
        </div>
      </footer>
    </div>
  );
}
