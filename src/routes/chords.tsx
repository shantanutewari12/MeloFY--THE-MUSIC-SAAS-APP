import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { GuitarDiagram } from "@/components/GuitarDiagram";
import { PianoDiagram } from "@/components/PianoDiagram";
import { resolveChord, type ResolvedChord } from "@/lib/chordEngine";
import { toast } from "sonner";

export const Route = createFileRoute("/chords")({
  head: () => ({
    meta: [
      { title: "Chord Diagrams — MusicKit" },
      { name: "description", content: "Look up any chord and see guitar + piano fingerings." },
    ],
  }),
  component: ChordsPage,
});

interface SavedChord {
  id: string;
  name: string;
  notes: string[];
  voicing: number[];
  createdAt: number;
}

function ChordsPage() {
  const [input, setInput] = useState("Cmaj7");
  const [chord, setChord] = useState<ResolvedChord | null>(null);
  const [voicingIdx, setVoicingIdx] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => { handleSubmit("Cmaj7"); }, []);

  function handleSubmit(value?: string) {
    const v = (value ?? input).trim();
    if (!v) return;
    const result = resolveChord(v);
    if (!result) {
      setError(`Couldn't parse "${v}". Try C, Am, G7, Dsus4, F#m7…`);
      setChord(null);
      return;
    }
    setError("");
    setChord(result);
    setVoicingIdx(0);
    // Practice history
    const history = JSON.parse(localStorage.getItem("musickit:history") ?? "[]");
    const next = [v, ...history.filter((h: string) => h !== v)].slice(0, 10);
    localStorage.setItem("musickit:history", JSON.stringify(next));
  }

  function saveChord() {
    if (!chord) return;
    const saved: SavedChord[] = JSON.parse(localStorage.getItem("musickit:saved") ?? "[]");
    const entry: SavedChord = {
      id: crypto.randomUUID(),
      name: chord.name,
      notes: chord.notes,
      voicing: chord.guitarVoicings[voicingIdx],
      createdAt: Date.now(),
    };
    localStorage.setItem("musickit:saved", JSON.stringify([entry, ...saved]));
    toast.success(`Saved ${chord.name}`);
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-accent text-sm font-semibold tracking-widest mb-2">01 — CHORDS</p>
          <h1 className="text-5xl md:text-6xl font-display">Chord Library</h1>
          <p className="text-muted-foreground mt-3">Type any chord — get guitar and piano diagrams instantly.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="flex gap-3 mb-8"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. C, Am, Gmaj7, F#m7, Bb9"
            className="flex-1 px-5 py-3 rounded-full bg-card border border-border focus:border-primary outline-none transition text-lg"
          />
          <button className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:scale-105 transition">
            Resolve
          </button>
        </form>

        {error && <p className="text-destructive mb-6">{error}</p>}

        {chord && (
          <div className="space-y-8">
            <div className="rounded-2xl bg-card/60 backdrop-blur border border-border p-6 flex flex-wrap items-center gap-6 justify-between">
              <div>
                <div className="text-muted-foreground text-xs tracking-widest">CHORD</div>
                <div className="font-display text-5xl">{chord.name}</div>
                <div className="text-accent text-sm mt-1">{chord.qualityLabel}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs tracking-widest">NOTES</div>
                <div className="flex gap-2 mt-2">
                  {chord.notes.map((n, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-primary/15 text-primary font-semibold">{n}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={saveChord}
                className="px-5 py-2.5 rounded-full bg-accent text-accent-foreground font-semibold hover:scale-105 transition"
              >
                ★ Save chord
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-card/40 border border-border p-6">
                <div className="flex gap-2 mb-4 justify-center">
                  {chord.guitarVoicings.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setVoicingIdx(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                        voicingIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-card"
                      }`}
                    >
                      Voicing {i + 1}
                    </button>
                  ))}
                </div>
                <GuitarDiagram voicing={chord.guitarVoicings[voicingIdx]} name={chord.name} />
              </div>
              <div className="rounded-2xl bg-card/40 border border-border p-6 flex items-center justify-center">
                <PianoDiagram highlightMidi={chord.pianoKeys} name={chord.name} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
