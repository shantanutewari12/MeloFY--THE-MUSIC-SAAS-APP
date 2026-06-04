import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { playInstallSound } from "../lib/audioSynth";
import { toast } from "sonner";
import { Music } from "lucide-react";

export function Navbar() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    playInstallSound();

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        toast.success("Thank you for installing MeloFY! 🎶");
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        toast.info(
          "To install MeloFY on iOS: tap the 'Share' icon in Safari and select 'Add to Home Screen' 📲",
          { duration: 6000 },
        );
      } else {
        toast.info(
          "MeloFY PWA installation: look for the install button in your browser's address bar or menu! 🚀",
        );
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full border-2 border-primary flex items-center justify-center animate-vinyl-spin group-hover:[animation-duration:2s]">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          </div>
          <span className="font-display text-xl tracking-wider">MELOFY</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {/* Desktop links - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
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
                activeProps={{
                  className: "px-3 py-2 rounded-full text-primary bg-primary/10 font-medium",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Glowing Install Button - only visible on mobile (md:hidden) */}
          {!isInstalled && (
            <button
              onClick={handleInstall}
              className="md:hidden ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-accent-foreground bg-gradient-to-r from-accent via-primary to-accent animate-pulse-glow hover:scale-105 active:scale-95 transition shadow-[0_0_15px_oklch(0.7_0.22_340/0.45)] border border-accent/35"
            >
              <Music className="w-3.5 h-3.5 text-accent-foreground animate-bounce" />
              <span>Install</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
