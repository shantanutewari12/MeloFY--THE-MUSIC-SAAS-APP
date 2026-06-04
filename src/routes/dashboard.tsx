import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MusicKit" },
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

function DashboardPage() {
  const [chords, setChords] = useState<SavedChord[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setChords(JSON.parse(localStorage.getItem("musickit:saved") ?? "[]"));
    setHistory(JSON.parse(localStorage.getItem("musickit:history") ?? "[]"));
  }, []);

  function deleteChord(id: string) {
    const next = chords.filter((c) => c.id !== id);
    setChords(next);
    localStorage.setItem("musickit:saved", JSON.stringify(next));
    toast.success("Deleted");
  }

  function exportPDF() {
    // Client-side: build a printable HTML and trigger print-to-PDF
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = chords.map((c) => `
      <div style="page-break-inside:avoid;border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:12px;">
        <h2 style="margin:0 0 6px;font-family:Georgia,serif;">${c.name}</h2>
        <div style="color:#555;font-size:14px;">Notes: ${c.notes.join(" · ")}</div>
        <div style="color:#888;font-size:12px;margin-top:4px;">Voicing (low→high E): ${c.voicing.map((f) => f === -1 ? "×" : f).join("  ")}</div>
      </div>`).join("");
    win.document.write(`
      <html><head><title>MusicKit — Saved Chords</title></head>
      <body style="font-family:Inter,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;">
        <h1 style="font-family:Georgia,serif;">My Chord Library</h1>
        <p style="color:#666;">${chords.length} chords · exported ${new Date().toLocaleDateString()}</p>
        ${rows || "<p>No saved chords yet.</p>"}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 200);
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
            <p className="text-muted-foreground mt-3">{chords.length} saved chord{chords.length === 1 ? "" : "s"}.</p>
          </div>
          <button onClick={exportPDF} className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:scale-105 transition">
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
                {chords.length === 0 ? "No saved chords yet. Head to the Chords page and save your first." : "No matches."}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filtered.map((c) => (
                  <div key={c.id} className="rounded-2xl bg-card/60 border border-border p-5 hover:border-primary/50 transition group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-display text-3xl">{c.name}</div>
                      <button onClick={() => deleteChord(c.id)} className="text-muted-foreground hover:text-destructive text-xl opacity-0 group-hover:opacity-100 transition">×</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {c.notes.map((n, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">{n}</span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {c.voicing.map((f, i) => (
                        <span key={i} className="inline-block w-6 text-center">{f === -1 ? "×" : f}</span>
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
                      <span className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">{i + 1}</span>
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
