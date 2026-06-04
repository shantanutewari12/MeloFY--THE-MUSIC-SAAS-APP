import { useRef } from "react";

interface Props {
  highlightMidi: number[]; // MIDI numbers to highlight
  name: string;
}

// Layout: 2 octaves starting at C4 (MIDI 60)
const WHITE_PATTERN = [0, 2, 4, 5, 7, 9, 11]; // semitone offsets within an octave
const BLACK_PATTERN = [1, 3, 6, 8, 10];
const OCTAVES = 2;
const START_MIDI = 60;

export function PianoDiagram({ highlightMidi, name }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const totalWhites = 7 * OCTAVES;
  const whiteW = 26;
  const whiteH = 130;
  const blackW = 16;
  const blackH = 80;
  const W = totalWhites * whiteW + 20;
  const H = whiteH + 40;
  const padX = 10,
    padTop = 20;

  const highlighted = new Set(highlightMidi);

  const downloadPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W * 2;
      canvas.height = H * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#1a1230";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `${name}-piano.png`;
        a.click();
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="font-display text-2xl">Piano</h3>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[400px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={W} height={H} fill="oklch(0.18 0.05 290)" rx="12" />
        {/* White keys */}
        {Array.from({ length: totalWhites }).map((_, i) => {
          const octave = Math.floor(i / 7);
          const noteIdx = i % 7;
          const midi = START_MIDI + octave * 12 + WHITE_PATTERN[noteIdx];
          const isHi = highlighted.has(midi);
          return (
            <rect
              key={`w${i}`}
              x={padX + i * whiteW}
              y={padTop}
              width={whiteW - 1}
              height={whiteH}
              fill={isHi ? "oklch(0.82 0.17 80)" : "oklch(0.97 0.02 90)"}
              stroke="oklch(0.2 0.04 290)"
              strokeWidth="1"
              rx="2"
            />
          );
        })}
        {/* Black keys */}
        {Array.from({ length: OCTAVES * 7 }).map((_, i) => {
          const octave = Math.floor(i / 7);
          const noteIdx = i % 7;
          // black key sits between white[i] and white[i+1] for noteIdx in {0,1,3,4,5}
          if (![0, 1, 3, 4, 5].includes(noteIdx)) return null;
          const blackSemitone = [1, 3, 6, 8, 10][[0, 1, 3, 4, 5].indexOf(noteIdx)];
          const midi = START_MIDI + octave * 12 + blackSemitone;
          const isHi = highlighted.has(midi);
          const x = padX + (i + 1) * whiteW - blackW / 2;
          return (
            <rect
              key={`b${i}`}
              x={x}
              y={padTop}
              width={blackW}
              height={blackH}
              fill={isHi ? "oklch(0.7 0.22 340)" : "oklch(0.15 0.04 285)"}
              stroke="oklch(0.05 0 0)"
              rx="2"
            />
          );
        })}
      </svg>
      <button
        onClick={downloadPNG}
        className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary transition"
      >
        Download PNG
      </button>
    </div>
  );
}
