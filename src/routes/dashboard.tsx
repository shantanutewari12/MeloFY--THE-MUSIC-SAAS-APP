import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { resolveChord } from "@/lib/chordEngine";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MeloFY" },
      { name: "description", content: "Your saved chords and practice history." },
    ],
  }),
  component: DashboardPage,
});

interface SavedChord {
  id: string;
  name: string;
  notes: string[];
  voicing: number[];
  createdAt: number;
}

function generateGuitarSvg(voicing: number[]): string {
  const maxFret = Math.max(...voicing.filter((f) => f > 0), 0);
  const baseFret = maxFret > 5 ? Math.max(1, Math.min(...voicing.filter((f) => f > 0)) - 1) : 0;
  const stringCount = 6;
  const fretCount = 6;
  const W = 140,
    H = 170;
  const padX = 20,
    padTop = 28,
    padBottom = 12;
  const usableW = W - padX * 2;
  const usableH = H - padTop - padBottom;
  const stringSpacing = usableW / (stringCount - 1);
  const fretSpacing = usableH / fretCount;

  // Simple finger heuristics
  const fingers = Array(6).fill(null);
  const pressed = voicing.map((fret, stringIdx) => ({ fret, stringIdx })).filter((x) => x.fret > 0);
  if (pressed.length > 0) {
    const minFret = Math.min(...pressed.map((p) => p.fret));
    const isBarre = pressed.filter((p) => p.fret === minFret).length >= 2;
    const sorted = [...pressed].sort((a, b) => a.stringIdx - b.stringIdx);
    if (isBarre) {
      sorted.forEach((p) => {
        if (p.fret === minFret) fingers[p.stringIdx] = 1;
      });
      const remaining = sorted
        .filter((p) => p.fret > minFret)
        .sort((a, b) => (a.fret !== b.fret ? a.fret - b.fret : a.stringIdx - b.stringIdx));
      remaining.forEach((p, idx) => {
        fingers[p.stringIdx] = Math.min(4, 2 + idx);
      });
    } else {
      const sortedByFretThenString = [...pressed].sort((a, b) =>
        a.fret !== b.fret ? a.fret - b.fret : a.stringIdx - b.stringIdx,
      );
      sortedByFretThenString.forEach((p, idx) => {
        fingers[p.stringIdx] = Math.min(4, idx + 1);
      });
    }
  }

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="font-family: system-ui, sans-serif;">`;
  svg += `<rect width="${W}" height="${H}" fill="#ffffff" rx="8"/>`;

  // String markers & open/mute indicators
  voicing.forEach((f, i) => {
    const label = ["E", "A", "D", "G", "B", "E"][i];
    const x = padX + i * stringSpacing;
    svg += `<text x="${x}" y="${padTop - 18}" text-anchor="middle" fill="#64748b" font-size="9" font-weight="600">${label}</text>`;
    if (f === -1) {
      svg += `<text x="${x}" y="${padTop - 5}" text-anchor="middle" fill="#ef4444" font-size="11" font-weight="black">×</text>`;
    } else if (f === 0) {
      svg += `<circle cx="${x}" cy="${padTop - 9}" r="3" fill="none" stroke="#475569" stroke-width="1.2"/>`;
    }
  });

  // Fret index numbers
  for (let i = 0; i < fretCount; i++) {
    const fretNum = baseFret + 1 + i;
    const y = padTop + (i + 0.5) * fretSpacing;
    svg += `<text x="${padX - 10}" y="${y + 3}" text-anchor="middle" fill="#3b0764" font-size="8" font-weight="700">${fretNum}</text>`;
  }

  // Nut bar
  if (baseFret === 0) {
    svg += `<rect x="${padX - 1}" y="${padTop - 1}" width="${usableW + 2}" height="3" fill="#1e293b"/>`;
  }

  // Frets
  for (let i = 0; i <= fretCount; i++) {
    const y = padTop + i * fretSpacing;
    svg += `<line x1="${padX}" y1="${y}" x2="${padX + usableW}" y2="${y}" stroke="#cbd5e1" stroke-width="1"/>`;
  }

  // Strings
  for (let i = 0; i < stringCount; i++) {
    const x = padX + i * stringSpacing;
    svg += `<line x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + usableH}" stroke="#94a3b8" stroke-width="1"/>`;
  }

  // Fret dots (fingering)
  voicing.forEach((f, i) => {
    if (f <= 0) return;
    const relFret = f - baseFret;
    if (relFret < 1 || relFret > fretCount) return;
    const x = padX + i * stringSpacing;
    const y = padTop + (relFret - 0.5) * fretSpacing;
    const finger = fingers[i];
    svg += `<circle cx="${x}" cy="${y}" r="6.5" fill="#db2777"/>`;
    if (finger !== null) {
      svg += `<text x="${x}" y="${y + 2.5}" text-anchor="middle" fill="#ffffff" font-size="7" font-weight="bold">${finger}</text>`;
    }
  });

  svg += `</svg>`;
  return svg;
}

function generatePianoSvg(highlightMidi: number[]): string {
  const highlighted = new Set(highlightMidi);
  const totalWhites = 14; // 2 octaves
  const whiteW = 12;
  const whiteH = 60;
  const blackW = 8;
  const blackH = 36;
  const W = totalWhites * whiteW + 10;
  const H = whiteH + 10;
  const padX = 5,
    padTop = 5;

  const WHITE_PATTERN = [0, 2, 4, 5, 7, 9, 11];

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${W}" height="${H}" fill="#ffffff" rx="8"/>`;

  // Whites
  for (let i = 0; i < totalWhites; i++) {
    const octave = Math.floor(i / 7);
    const noteIdx = i % 7;
    const midi = 60 + octave * 12 + WHITE_PATTERN[noteIdx];
    const isHi = highlighted.has(midi);
    svg += `<rect x="${padX + i * whiteW}" y="${padTop}" width="${whiteW - 1}" height="${whiteH}" fill="${isHi ? "#eab308" : "#f8fafc"}" stroke="#cbd5e1" stroke-width="1" rx="1.5"/>`;
  }

  // Blacks
  for (let i = 0; i < 14; i++) {
    const octave = Math.floor(i / 7);
    const noteIdx = i % 7;
    if (![0, 1, 3, 4, 5].includes(noteIdx)) continue;
    const blackSemitone = [1, 3, 6, 8, 10][[0, 1, 3, 4, 5].indexOf(noteIdx)];
    const midi = 60 + octave * 12 + blackSemitone;
    const isHi = highlighted.has(midi);
    const x = padX + (i + 1) * whiteW - blackW / 2;
    svg += `<rect x="${x}" y="${padTop}" width="${blackW}" height="${blackH}" fill="${isHi ? "#db2777" : "#1e293b"}" stroke="#0f172a" rx="1"/>`;
  }

  svg += `</svg>`;
  return svg;
}

function DashboardPage() {
  const [chords, setChords] = useState<SavedChord[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setChords(
      JSON.parse(
        localStorage.getItem("melofy:saved") ?? localStorage.getItem("musickit:saved") ?? "[]",
      ),
    );
    setHistory(
      JSON.parse(
        localStorage.getItem("melofy:history") ?? localStorage.getItem("musickit:history") ?? "[]",
      ),
    );
  }, []);

  function deleteChord(id: string) {
    const next = chords.filter((c) => c.id !== id);
    setChords(next);
    localStorage.setItem("melofy:saved", JSON.stringify(next));
    toast.success("Deleted");
  }

  function exportPDF() {
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Popup was blocked! Please allow popups to export your PDF chord sheet. 📑");
      return;
    }
    const rows = chords
      .map((c) => {
        const voicingStr = c.voicing.map((f) => (f === -1 ? "×" : f)).join(" ");
        const resolved = resolveChord(c.name);
        const pianoKeys = resolved ? resolved.pianoKeys : [];
        const guitarSvg = generateGuitarSvg(c.voicing);
        const pianoSvg = resolved ? generatePianoSvg(pianoKeys) : "";

        return `
        <div class="chord-card">
          <div class="chord-header">
            <h2>${c.name}</h2>
            <span class="notes">${c.notes.join(" • ")}</span>
          </div>
          <div class="diagrams">
            <div class="diagram-box">
              <div class="diagram-title">GUITAR VOICING</div>
              <div class="svg-container">${guitarSvg}</div>
              <div class="voicing-txt">${voicingStr}</div>
            </div>
            ${
              resolved
                ? `
            <div class="diagram-box">
              <div class="diagram-title">PIANO KEYS</div>
              <div class="svg-container">${pianoSvg}</div>
            </div>
            `
                : ""
            }
          </div>
        </div>
      `;
      })
      .join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>MeloFY — My Saved Chords</title>
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #1e1b4b;
            max-width: 900px;
            margin: 40px auto;
            padding: 0 24px;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          h1 {
            font-family: Georgia, serif;
            color: #3b0764;
            margin-bottom: 8px;
            font-size: 36px;
            font-weight: 900;
          }
          .subtitle {
            color: #64748b;
            font-size: 14px;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 16px;
            margin-bottom: 30px;
            font-weight: 500;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
          .chord-card {
            border: 1.5px solid #e2e8f0;
            border-radius: 16px;
            padding: 20px;
            background: #f8fafc;
            page-break-inside: avoid;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .chord-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
          }
          .chord-card h2 {
            margin: 0;
            font-size: 26px;
            font-family: Georgia, serif;
            color: #3b0764;
          }
          .notes {
            font-size: 13px;
            font-weight: 700;
            color: #db2777;
            background: #fdf2f8;
            padding: 3px 9px;
            border-radius: 9999px;
            border: 1px solid #fbcfe8;
          }
          .diagrams {
            display: grid;
            grid-template-columns: 1fr 1.3fr;
            gap: 12px;
            align-items: start;
          }
          .diagram-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            background: #ffffff;
            padding: 10px;
            border-radius: 10px;
            border: 1px solid #f1f5f9;
          }
          .diagram-title {
            font-size: 9px;
            font-weight: 800;
            color: #64748b;
            letter-spacing: 0.05em;
          }
          .svg-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
          }
          .voicing-txt {
            font-size: 11px;
            font-family: monospace;
            color: #475569;
            background: #f1f5f9;
            padding: 2px 8px;
            border-radius: 4px;
            margin-top: 2px;
          }
          .no-print {
            margin-bottom: 24px;
            padding: 14px 20px;
            background: #f1f5f9;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #e2e8f0;
          }
          .no-print-text {
            font-size: 14px;
            color: #475569;
            font-weight: 500;
          }
          .no-print-btn {
            padding: 8px 18px;
            background: #3b0764;
            color: white;
            border: none;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 13px;
          }
          .no-print-btn:hover {
            background: #581c87;
            transform: translateY(-1px);
          }
          @media print {
            .no-print { display: none !important; }
            body { margin: 20px auto; }
            .chord-card {
              background: #f8fafc !important;
              border: 1.5px solid #cbd5e1 !important;
              box-shadow: none !important;
            }
          }
          @media (max-width: 640px) {
            .grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <span class="no-print-text">📑 Print Preview Ready! If the print window didn't open automatically, click the button to print.</span>
          <button class="no-print-btn" onclick="window.print()">Print / Save PDF</button>
        </div>
        <h1>My Chord Library</h1>
        <div class="subtitle">
          Generated by MeloFY &middot; ${chords.length} Saved Chord${chords.length === 1 ? "" : "s"} &middot; ${new Date().toLocaleDateString()}
        </div>
        <div class="grid">
          ${rows || "<p>No saved chords yet.</p>"}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  }

  const filtered = chords.filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10 flex flex-wrap justify-between items-end gap-4">
          <div>
            <p className="text-accent text-sm font-semibold tracking-widest mb-2">04 — DASHBOARD</p>
            <h1 className="text-5xl md:text-6xl font-display">Your Library</h1>
            <p className="text-muted-foreground mt-3">
              {chords.length} saved chord{chords.length === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            onClick={exportPDF}
            className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:scale-105 transition"
          >
            ↓ Export as PDF
          </button>
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
          <section>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter saved chords…"
              className="w-full px-5 py-3 rounded-full bg-card border border-border focus:border-primary outline-none transition mb-6"
            />
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                {chords.length === 0
                  ? "No saved chords yet. Head to the Chords page and save your first."
                  : "No matches."}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl bg-card/60 border border-border p-5 hover:border-primary/50 transition group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-display text-3xl">{c.name}</div>
                      <button
                        onClick={() => deleteChord(c.id)}
                        className="text-muted-foreground hover:text-destructive text-xl opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {c.notes.map((n, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {c.voicing.map((f, i) => (
                        <span key={i} className="inline-block w-6 text-center">
                          {f === -1 ? "×" : f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside>
            <h2 className="font-display text-2xl mb-4">Recent Searches</h2>
            <div className="rounded-2xl bg-card/40 border border-border p-5">
              {history.length === 0 ? (
                <p className="text-muted-foreground text-sm">No history yet.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((h, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="font-mono">{h}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
