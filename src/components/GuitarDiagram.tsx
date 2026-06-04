import { useRef } from "react";

interface Props {
  voicing: number[]; // 6 frets, low E to high E (-1 = mute, 0 = open)
  name: string;
}

export function GuitarDiagram({ voicing, name }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const maxFret = Math.max(...voicing.filter((f) => f > 0), 0);
  const baseFret = maxFret > 5 ? Math.max(1, Math.min(...voicing.filter((f) => f > 0)) - 1) : 0;
  const stringCount = 6;
  const fretCount = 6;
  const W = 220, H = 280;
  const padX = 30, padTop = 40, padBottom = 20;
  const usableW = W - padX * 2;
  const usableH = H - padTop - padBottom;
  const stringSpacing = usableW / (stringCount - 1);
  const fretSpacing = usableH / fretCount;

  const downloadPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W * 2; canvas.height = H * 2;
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
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[220px]" xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} fill="oklch(0.18 0.05 290)" rx="12"/>
        {/* string labels & markers */}
        {voicing.map((f, i) => {
          const label = ["E", "A", "D", "G", "B", "E"][i];
          const x = padX + i * stringSpacing;
          return (
            <g key={i}>
              <text x={x} y={padTop - 22} textAnchor="middle" fill="oklch(0.72 0.04 90)" fontSize="10" fontFamily="Inter">{label}</text>
              {f === -1 && <text x={x} y={padTop - 8} textAnchor="middle" fill="oklch(0.6 0.24 27)" fontSize="14" fontWeight="bold">×</text>}
              {f === 0 && <circle cx={x} cy={padTop - 12} r="5" fill="none" stroke="oklch(0.97 0.02 90)" strokeWidth="1.5"/>}
            </g>
          );
        })}
        {/* nut or fret number */}
        {baseFret === 0 ? (
          <rect x={padX - 2} y={padTop - 2} width={usableW + 4} height={4} fill="oklch(0.97 0.02 90)"/>
        ) : (
          <text x={padX - 12} y={padTop + 12} fill="oklch(0.82 0.17 80)" fontSize="11" fontFamily="Inter" fontWeight="600">{baseFret + 1}fr</text>
        )}
        {/* frets */}
        {Array.from({ length: fretCount + 1 }).map((_, i) => (
          <line key={i} x1={padX} y1={padTop + i * fretSpacing} x2={padX + usableW} y2={padTop + i * fretSpacing} stroke="oklch(0.5 0.04 290)" strokeWidth="1"/>
        ))}
        {/* strings */}
        {Array.from({ length: stringCount }).map((_, i) => (
          <line key={i} x1={padX + i * stringSpacing} y1={padTop} x2={padX + i * stringSpacing} y2={padTop + usableH} stroke="oklch(0.7 0.04 90)" strokeWidth="1.2"/>
        ))}
        {/* dots */}
        {voicing.map((f, i) => {
          if (f <= 0) return null;
          const relFret = f - baseFret;
          if (relFret < 1 || relFret > fretCount) return null;
          const x = padX + i * stringSpacing;
          const y = padTop + (relFret - 0.5) * fretSpacing;
          return <circle key={i} cx={x} cy={y} r="9" fill="oklch(0.7 0.22 340)" stroke="oklch(0.97 0.02 90)" strokeWidth="1"/>;
        })}
      </svg>
      <button onClick={downloadPNG} className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary transition">Download PNG</button>
    </div>
  );
}
