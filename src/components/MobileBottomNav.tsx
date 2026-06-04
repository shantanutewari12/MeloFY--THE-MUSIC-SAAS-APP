import { Link } from "@tanstack/react-router";
import { Music, Gauge, Mic, Library } from "lucide-react";

export function MobileBottomNav() {
  const tabs = [
    { to: "/chords", label: "Chords", icon: Music },
    { to: "/metronome", label: "Metronome", icon: Gauge },
    { to: "/tuner", label: "Tuner", icon: Mic },
    { to: "/dashboard", label: "Library", icon: Library },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/85 backdrop-blur-xl border-t border-border/80 px-4 py-2.5 flex justify-around items-center shadow-[0_-10px_35px_rgba(0,0,0,0.6)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="flex flex-col items-center justify-center gap-1 py-1 px-3.5 rounded-xl transition-all duration-150 active:scale-95"
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-[22px] h-[22px] transition-all duration-200 ${
                    isActive
                      ? "text-primary scale-110 drop-shadow-[0_0_8px_oklch(0.82_0.17_80/0.6)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                />
                <span
                  className={`text-[10px] tracking-wide transition-all ${
                    isActive ? "text-primary font-bold" : "text-muted-foreground font-medium"
                  }`}
                >
                  {tab.label}
                </span>
              </>
            )}
          </Link>
        );
      })}
    </div>
  );
}
