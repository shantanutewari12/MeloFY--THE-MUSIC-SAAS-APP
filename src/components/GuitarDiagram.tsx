import { useRef } from "react";

interface Props {
  voicing: number[]; // 6 frets, low E to high E (-1 = mute, 0 = open)
  name: string;
}

export function getGuitarFingering(voicing: number[]): (number | null)[] {
  const voicingStr = voicing.join(",");
  const presetFingerings: Record<string, (number | null)[]> = {
    "-1,3,2,0,1,0": [null, 3, 2, null, 1, null], // C
    "-1,3,2,3,1,0": [null, 3, 2, 4, 1, null], // C7
    "-1,3,2,0,0,0": [null, 3, 2, null, null, null], // Cmaj7
    "-1,0,2,2,1,0": [null, null, 2, 3, 1, null], // Am
    "-1,0,2,0,1,0": [null, null, 2, null, 1, null], // Am7
    "-1,0,2,2,1,3": [null, null, 2, 3, 1, 4], // Am6
    "-1,0,2,2,2,0": [null, null, 1, 2, 3, null], // A
    "-1,0,2,0,2,0": [null, null, 1, null, 2, null], // A7
    "-1,0,2,1,2,0": [null, null, 2, 1, 3, null], // Amaj7
    "3,2,0,0,0,3": [3, 2, null, null, null, 4], // G
    "3,2,0,0,0,1": [3, 2, null, null, null, 1], // G7
    "3,2,0,0,0,2": [3, 1, null, null, null, 2], // Gmaj7
    "0,2,2,1,0,0": [null, 2, 3, 1, null, null], // E
    "0,2,2,0,0,0": [null, 2, 3, null, null, null], // Em
    "0,2,0,1,0,0": [null, 2, null, 1, null, null], // E7
    "0,2,2,0,3,0": [null, 2, 3, null, 4, null], // Em7
    "0,2,1,2,0,2": [null, 2, 1, 3, null, 4], // B7
    "-1,-1,0,2,3,2": [null, null, null, 1, 3, 2], // D
    "-1,-1,0,2,3,1": [null, null, null, 2, 3, 1], // Dm
    "-1,-1,0,2,1,2": [null, null, null, 2, 1, 3], // D7
    "-1,-1,0,2,2,2": [null, null, null, 1, 1, 1], // Dmaj7
  };

  if (presetFingerings[voicingStr]) {
    return presetFingerings[voicingStr];
  }

  // Heuristic algorithm for other voicings (like barre chords or custom voicings)
  const fingers = Array(6).fill(null);
  const pressed = voicing.map((fret, stringIdx) => ({ fret, stringIdx })).filter((x) => x.fret > 0);

  if (pressed.length === 0) return fingers;

  const minFret = Math.min(...pressed.map((p) => p.fret));

  // A barre is present if minFret is pressed on 2 or more strings
  const isBarre = pressed.filter((p) => p.fret === minFret).length >= 2;
  const sorted = [...pressed].sort((a, b) => a.stringIdx - b.stringIdx);

  if (isBarre) {
    // All strings at minFret get Finger 1
    sorted.forEach((p) => {
      if (p.fret === minFret) {
        fingers[p.stringIdx] = 1;
      }
    });
    // Remaining strings get fingers 2, 3, 4 based on their fret order relative to minFret
    const remaining = sorted
      .filter((p) => p.fret > minFret)
      .sort((a, b) => {
        if (a.fret !== b.fret) return a.fret - b.fret;
        return a.stringIdx - b.stringIdx;
      });
    remaining.forEach((p, idx) => {
      fingers[p.stringIdx] = Math.min(4, 2 + idx);
    });
  } else {
    // Open chord or shifted shape: sort by fret, then string index
    const sortedByFretThenString = [...pressed].sort((a, b) => {
      if (a.fret !== b.fret) return a.fret - b.fret;
      return a.stringIdx - b.stringIdx;
    });

    sortedByFretThenString.forEach((p, idx) => {
      fingers[p.stringIdx] = Math.min(4, idx + 1);
    });
  }

  return fingers;
}

export function GuitarDiagram({ voicing, name }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const maxFret = Math.max(...voicing.filter((f) => f > 0), 0);
  const baseFret = maxFret > 5 ? Math.max(1, Math.min(...voicing.filter((f) => f > 0)) - 1) : 0;
  const stringCount = 6;
  const fretCount = 6;
  const W = 220,
    H = 280;
  const padX = 30,
    padTop = 40,
    padBottom = 20;
  const usableW = W - padX * 2;
  const usableH = H - padTop - padBottom;
  const stringSpacing = usableW / (stringCount - 1);
  const fretSpacing = usableH / fretCount;

  const fingers = getGuitarFingering(voicing);

  const downloadPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
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
        a.download = `${name}-guitar.png`;
        a.click();
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <h3 className="font-display text-2xl">Guitar</h3>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[220px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={W} height={H} fill="oklch(0.18 0.05 290)" rx="12" />

        {/* string labels & markers */}
        {voicing.map((f, i) => {
          const label = ["E", "A", "D", "G", "B", "E"][i];
          const x = padX + i * stringSpacing;
          return (
            <g key={i}>
              <text
                x={x}
                y={padTop - 22}
                textAnchor="middle"
                fill="oklch(0.72 0.04 90)"
                fontSize="10"
                fontFamily="Inter"
              >
                {label}
              </text>
              {f === -1 && (
                <text
                  x={x}
                  y={padTop - 8}
                  textAnchor="middle"
                  fill="oklch(0.6 0.24 27)"
                  fontSize="14"
                  fontWeight="bold"
                >
                  ×
                </text>
              )}
              {f === 0 && (
                <circle
                  cx={x}
                  cy={padTop - 12}
                  r="5"
                  fill="none"
                  stroke="oklch(0.97 0.02 90)"
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        })}

        {/* fret index numbers on the left of grid */}
        {Array.from({ length: fretCount }).map((_, i) => {
          const fretNum = baseFret + 1 + i;
          const y = padTop + (i + 0.5) * fretSpacing;
          return (
            <text
              key={i}
              x={padX - 16}
              y={y + 3.5}
              textAnchor="middle"
              fill="oklch(0.82 0.17 80)"
              fontSize="10"
              fontWeight="600"
              fontFamily="Inter"
            >
              {fretNum}
            </text>
          );
        })}

        {/* nut bar (if baseFret is 0) */}
        {baseFret === 0 && (
          <rect
            x={padX - 2}
            y={padTop - 2}
            width={usableW + 4}
            height={4}
            fill="oklch(0.97 0.02 90)"
          />
        )}

        {/* frets */}
        {Array.from({ length: fretCount + 1 }).map((_, i) => (
          <line
            key={i}
            x1={padX}
            y1={padTop + i * fretSpacing}
            x2={padX + usableW}
            y2={padTop + i * fretSpacing}
            stroke="oklch(0.5 0.04 290)"
            strokeWidth="1"
          />
        ))}

        {/* strings */}
        {Array.from({ length: stringCount }).map((_, i) => (
          <line
            key={i}
            x1={padX + i * stringSpacing}
            y1={padTop}
            x2={padX + i * stringSpacing}
            y2={padTop + usableH}
            stroke="oklch(0.7 0.04 90)"
            strokeWidth="1.2"
          />
        ))}

        {/* dots with finger numbers */}
        {voicing.map((f, i) => {
          if (f <= 0) return null;
          const relFret = f - baseFret;
          if (relFret < 1 || relFret > fretCount) return null;
          const x = padX + i * stringSpacing;
          const y = padTop + (relFret - 0.5) * fretSpacing;
          const finger = fingers[i];
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="9.5"
                fill="oklch(0.7 0.22 340)"
                stroke="oklch(0.97 0.02 90)"
                strokeWidth="1"
              />
              {finger !== null && (
                <text
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fill="oklch(0.97 0.02 90)"
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="Inter"
                >
                  {finger}
                </text>
              )}
            </g>
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
