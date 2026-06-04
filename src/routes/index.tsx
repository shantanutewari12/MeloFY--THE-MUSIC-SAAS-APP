import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MusicKit — The All-in-One Toolkit for Musicians" },
      { name: "description", content: "Chord diagrams, metronome, tuner, and practice tracker. Built for musicians who play." },
      { property: "og:title", content: "MusicKit — Tools for Musicians" },
      { property: "og:description", content: "Chords, metronome, tuner & practice tracking in one beautiful app." },
    ],
  }),
  component: Index,
});

function Equalizer({ bars = 5, className = "" }: { bars?: number; className?: string }) {
  return (
    <div className={`flex items-end gap-1 h-8 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-1 bg-gradient-to-t from-primary to-accent rounded-full origin-bottom animate-equalize"
          style={{ height: "100%", animationDelay: `${i * 0.15}s`, animationDuration: `${0.8 + (i % 3) * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function FloatingNotes() {
  const notes = ["♪", "♫", "♬", "♩", "𝄞"];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute text-2xl md:text-4xl text-primary/30 animate-float-note"
          style={{
            left: `${(i * 7.3) % 100}%`,
            bottom: "-40px",
            animationDelay: `${(i * 0.7) % 6}s`,
            animationDuration: `${5 + (i % 4)}s`,
          }}
        >
          {notes[i % notes.length]}
        </span>
      ))}
    </div>
  );
}

function Waveform() {
  return (
    <svg viewBox="0 0 400 80" className="w-full h-16">
      {Array.from({ length: 60 }).map((_, i) => {
        const h = 10 + Math.abs(Math.sin(i * 0.4)) * 50 + (i % 5) * 3;
        return (
          <rect
            key={i}
            x={i * 7}
            y={40 - h / 2}
            width="3"
            height={h}
            rx="1.5"
            className="fill-primary animate-equalize origin-center"
            style={{ animationDelay: `${i * 0.05}s`, animationDuration: `${1 + (i % 3) * 0.3}s` }}
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
        <rect x="10" y="15" width="80" height="80" fill="oklch(0.97 0.02 90 / 0.05)" stroke="oklch(0.82 0.17 80)" strokeWidth="1.5"/>
        {[1, 2, 3, 4].map((i) => (
          <line key={`h${i}`} x1="10" y1={15 + i * 20} x2="90" y2={15 + i * 20} stroke="oklch(0.82 0.17 80 / 0.6)" strokeWidth="0.8"/>
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`v${i}`} x1={10 + i * 16} y1="15" x2={10 + i * 16} y2="95" stroke="oklch(0.82 0.17 80 / 0.6)" strokeWidth="0.8"/>
        ))}
        {frets.map((f, i) => {
          const x = 10 + i * 16;
          if (f === "x") return <text key={i} x={x} y="10" textAnchor="middle" className="fill-destructive" fontSize="8">×</text>;
          if (f === 0) return <circle key={i} cx={x} cy="8" r="2.5" fill="none" stroke="oklch(0.97 0.02 90)" strokeWidth="1"/>;
          return <circle key={i} cx={x} cy={5 + f * 20} r="4" className="fill-accent" />;
        })}
      </svg>
    </div>
  );
}

function Index() {
  const [bpm, setBpm] = useState(120);
  const [beat, setBeat] = useState(0);

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
          <span className="font-display text-2xl tracking-wider">MUSICKIT</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#chords" className="hover:text-primary transition">Chords</a>
          <a href="#metronome" className="hover:text-primary transition">Metronome</a>
          <a href="#tuner" className="hover:text-primary transition">Tuner</a>
          <a href="#practice" className="hover:text-primary transition">Practice</a>
        </nav>
        <button className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:scale-105 transition shadow-[0_0_30px_oklch(0.82_0.17_80/0.3)]">
          Sign in
        </button>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-6 md:px-12 pt-12 pb-24">
        <FloatingNotes />
        <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-xs text-accent">
              <Equalizer bars={3} className="h-3" />
              Now in tune
            </div>
            <h1 className="text-6xl md:text-8xl font-display leading-[0.9]">
              Play it.
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Tune it.
              </span>
              <br />
              Master it.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Four essential tools for every musician — chord library, metronome,
              chromatic tuner, and practice journal. One beautiful app.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button className="group px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold animate-pulse-glow hover:scale-105 transition flex items-center gap-2">
                ▶ Start playing
              </button>
              <button className="px-7 py-3 rounded-full border border-border hover:border-primary transition font-semibold">
                See chord library
              </button>
            </div>
          </div>

          {/* HERO VISUAL: vinyl + equalizer */}
          <div className="relative aspect-square max-w-md mx-auto">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/30 via-primary/20 to-transparent blur-3xl" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-card to-background border-8 border-card flex items-center justify-center animate-vinyl-spin shadow-2xl">
              <div className="absolute inset-4 rounded-full border border-primary/20" />
              <div className="absolute inset-8 rounded-full border border-primary/15" />
              <div className="absolute inset-14 rounded-full border border-primary/10" />
              <div className="w-1/3 h-1/3 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-background" />
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl bg-card/90 backdrop-blur border border-border shadow-xl">
              <Equalizer bars={9} className="h-10" />
            </div>
          </div>
        </div>

        {/* MARQUEE */}
        <div className="mt-24 overflow-hidden border-y border-border py-4">
          <div className="flex gap-12 animate-marquee whitespace-nowrap font-display text-3xl text-muted-foreground/60">
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-12">
                {["CHORDS", "♪", "METRONOME", "♫", "TUNER", "♬", "PRACTICE", "♩", "RHYTHM", "𝄞", "MELODY", "♪"].map((w, i) => (
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
              Sample-accurate timing powered by Web Audio. Tap tempo, custom subdivisions,
              and visual beat indicators.
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
                      beat === i ? "bg-primary scale-150 shadow-[0_0_20px_oklch(0.82_0.17_80)]" : "bg-muted"
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
              Chromatic tuner with YIN pitch detection running in a Web Worker —
              never blocks your sound.
            </p>
          </div>
          <div className="md:order-1 rounded-3xl bg-card/80 backdrop-blur border border-border p-10 shadow-2xl">
            <Waveform />
            <div className="mt-6 flex items-center justify-between">
              <div>
                <div className="text-muted-foreground text-xs tracking-widest">DETECTED</div>
                <div className="font-display text-5xl">A<span className="text-accent">4</span></div>
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
          <p className="text-accent text-sm font-semibold tracking-widest mb-4 relative">04 — PRACTICE</p>
          <h2 className="text-5xl md:text-7xl font-display mb-6 relative">
            Every session,
            <br />
            <span className="italic">remembered.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 relative">
            Save chords, export PDFs of your favorites, and track every practice session
            in your personal dashboard.
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
            <span className="font-display tracking-wider">MUSICKIT</span>
          </div>
          <div>© 2026 — Built for musicians who play.</div>
        </div>
      </footer>
    </div>
  );
}
