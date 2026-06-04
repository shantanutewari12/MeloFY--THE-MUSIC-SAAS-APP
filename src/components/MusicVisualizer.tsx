import { useState } from "react";

export function MusicVisualizer() {
  const [isPlaying] = useState(true);
  const notes = ["♪", "♫", "♬", "♩", "𝄞"];

  // Generate 48 radiating bars in a circle
  const barCount = 48;

  return (
    <div className="relative w-full max-w-[300px] sm:max-w-[380px] md:max-w-[440px] aspect-square mx-auto flex items-center justify-center">
      {/* Outer Glowing Aura */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent/25 via-primary/10 to-transparent blur-3xl animate-pulse" />

      {/* Radial Visualizer Bars */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-[0.75] sm:scale-[0.9] md:scale-100">
        {Array.from({ length: barCount }).map((_, i) => {
          const angle = (i * 360) / barCount;
          // Vary the animation delays and durations to simulate dynamic audio spectrum analysis
          const delay = (i % 6) * 0.12;
          const duration = 0.65 + (i % 4) * 0.15;
          return (
            <div
              key={i}
              className="absolute w-[2.5px] bg-gradient-to-t from-primary via-accent to-primary rounded-full origin-bottom"
              style={{
                transform: `rotate(${angle}deg) translateY(-145px)`,
                animation: `visualizer-pulse ${duration}s ease-in-out infinite alternate`,
                animationDelay: `${delay}s`,
                height: "6px",
              }}
            />
          );
        })}
      </div>

      {/* Pulsating Orbit Rings */}
      <div
        className="absolute w-[200px] sm:w-[260px] md:w-[290px] h-[200px] sm:h-[260px] md:h-[290px] rounded-full border border-primary/20 animate-ping opacity-25"
        style={{ animationDuration: "3.5s" }}
      />
      <div
        className="absolute w-[180px] sm:w-[230px] md:w-[260px] h-[180px] sm:h-[230px] md:h-[260px] rounded-full border border-accent/20 animate-ping opacity-20"
        style={{ animationDuration: "5s", animationDelay: "1.8s" }}
      />

      {/* Vinyl Record */}
      <div className="absolute w-[180px] sm:w-[220px] md:w-[260px] h-[180px] sm:h-[220px] md:h-[260px] rounded-full bg-slate-950 border-4 border-card flex items-center justify-center shadow-2xl relative overflow-hidden">
        {/* Grooves */}
        <div className="absolute inset-1.5 sm:inset-2 rounded-full border border-white/5" />
        <div className="absolute inset-4 sm:inset-6 rounded-full border border-white/10" />
        <div className="absolute inset-7 sm:inset-10 rounded-full border border-white/5" />
        <div className="absolute inset-10 sm:inset-14 rounded-full border border-white/8" />
        <div className="absolute inset-13 sm:inset-18 rounded-full border border-white/5" />
        <div className="absolute inset-16 sm:inset-22 rounded-full border border-white/10" />

        {/* Glossy Conic Reflection */}
        <div
          className="absolute inset-0 rounded-full mix-blend-screen opacity-15 pointer-events-none"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, white 45deg, transparent 90deg, transparent 180deg, white 225deg, transparent 270deg, transparent 360deg)",
          }}
        />

        {/* Spin disk */}
        <div
          className={`w-[160px] sm:w-[200px] md:w-[238px] h-[160px] sm:h-[200px] md:h-[238px] rounded-full flex items-center justify-center border-4 border-slate-900 shadow-inner ${isPlaying ? "animate-vinyl-spin" : ""}`}
        >
          {/* Inner Groove */}
          <div className="absolute inset-8 sm:inset-12 rounded-full border border-white/5" />

          {/* Center Label (Gold Gradient) */}
          <div className="w-[60px] sm:w-[75px] md:w-[85px] h-[60px] sm:h-[75px] md:h-[85px] rounded-full bg-gradient-to-br from-primary via-accent to-primary p-0.5 shadow-lg flex items-center justify-center relative">
            <div className="absolute inset-1 rounded-full bg-slate-950 flex flex-col items-center justify-center text-[6px] sm:text-[7.5px] font-bold tracking-widest text-primary">
              <span>MUSIC</span>
              <span className="text-accent text-[4.5px] sm:text-[5.5px]">KIT</span>
            </div>

            {/* Center Spindle Hole */}
            <div className="w-3 sm:w-4 h-3 sm:h-4 rounded-full bg-slate-900 border-2 border-slate-950 z-10" />
          </div>
        </div>
      </div>

      {/* Tonearm needle */}
      <div
        className="absolute top-[10px] sm:top-[20px] md:top-[30px] right-[10px] sm:right-[30px] md:right-[40px] w-[60px] sm:w-[70px] md:w-[85px] h-[90px] sm:h-[105px] md:h-[125px] origin-top-right transition-transform duration-700 pointer-events-none"
        style={{
          transform: isPlaying ? "rotate(-6deg)" : "rotate(-26deg)",
        }}
      >
        <svg viewBox="0 0 80 120" className="w-full h-full drop-shadow-xl">
          {/* Base */}
          <circle
            cx="65"
            cy="15"
            r="11"
            fill="oklch(0.3 0.06 290)"
            stroke="oklch(0.82 0.17 80)"
            strokeWidth="1.8"
          />
          <circle cx="65" cy="15" r="4.5" fill="oklch(0.97 0.02 90)" />

          {/* Arm bar */}
          <path
            d="M 65 15 Q 50 60 40 90 L 30 110"
            fill="none"
            stroke="oklch(0.82 0.17 80)"
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <path
            d="M 65 15 Q 50 60 40 90 L 30 110"
            fill="none"
            stroke="oklch(0.97 0.02 90)"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* Stylus Cartridge */}
          <rect
            x="23"
            y="105"
            width="14"
            height="9"
            rx="1.8"
            fill="oklch(0.7 0.22 340)"
            transform="rotate(-15 30 109)"
          />
        </svg>
      </div>

      {/* Floating Notes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 7 }).map((_, i) => {
          const delay = i * 1.35;
          const duration = 5.5 + (i % 3);
          const left = 22 + ((i * 14) % 55);
          return (
            <span
              key={i}
              className="absolute text-2xl sm:text-3xl text-primary/40 animate-float-note drop-shadow-[0_0_8px_oklch(0.82_0.17_80/0.45)]"
              style={{
                left: `${left}%`,
                bottom: "12%",
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
              }}
            >
              {notes[i % notes.length]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
