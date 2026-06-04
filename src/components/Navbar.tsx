import { Link } from "@tanstack/react-router";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full border-2 border-primary flex items-center justify-center animate-vinyl-spin group-hover:[animation-duration:2s]">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          </div>
          <span className="font-display text-xl tracking-wider">MUSICKIT</span>
        </Link>
        <nav className="flex items-center gap-1 md:gap-2 text-sm">
          {[
            { to: "/chords", label: "Chords" },
            { to: "/metronome", label: "Metronome" },
            { to: "/tuner", label: "Tuner" },
            { to: "/dashboard", label: "Dashboard" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-card/60 transition"
              activeProps={{ className: "px-3 py-2 rounded-full text-primary bg-primary/10" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
