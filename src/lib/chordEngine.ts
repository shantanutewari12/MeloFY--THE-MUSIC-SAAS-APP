// Custom music theory engine. No external libraries.

const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const ENHARMONIC: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  "C#": "C#",
  "D#": "D#",
  "F#": "F#",
  "G#": "G#",
  "A#": "A#",
};

// Chord quality -> intervals from root (semitones)
export const QUALITIES: Record<string, number[]> = {
  "": [0, 4, 7], // major
  maj: [0, 4, 7],
  M: [0, 4, 7],
  m: [0, 3, 7], // minor
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  M7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  "7": [0, 4, 7, 10], // dom7
  dom7: [0, 4, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  m6: [0, 3, 7, 9],
  "6": [0, 4, 7, 9],
  add9: [0, 4, 7, 14],
  "9": [0, 4, 7, 10, 14],
  m9: [0, 3, 7, 10, 14],
};

export const QUALITY_LABEL: Record<string, string> = {
  "": "Major",
  maj: "Major",
  M: "Major",
  m: "Minor",
  min: "Minor",
  maj7: "Major 7th",
  M7: "Major 7th",
  m7: "Minor 7th",
  min7: "Minor 7th",
  "7": "Dominant 7th",
  dom7: "Dominant 7th",
  sus2: "Suspended 2nd",
  sus4: "Suspended 4th",
  dim: "Diminished",
  dim7: "Diminished 7th",
  aug: "Augmented",
  m6: "Minor 6th",
  "6": "Major 6th",
  add9: "Add 9",
  "9": "Dominant 9th",
  m9: "Minor 9th",
};

function normalizeNote(raw: string): { note: string; index: number } | null {
  if (!raw) return null;
  let n = raw[0].toUpperCase();
  let rest = raw.slice(1);
  if (rest.startsWith("#") || rest.startsWith("b")) {
    n += rest[0] === "b" ? "b" : "#";
    rest = rest.slice(1);
  }
  const canonical = ENHARMONIC[n] ?? n;
  const idx = NOTES_SHARP.indexOf(canonical);
  if (idx === -1) return null;
  return { note: canonical, index: idx };
}

export function parseChord(
  input: string,
): { root: string; rootIndex: number; quality: string } | null {
  const cleaned = input.trim();
  if (!cleaned) return null;
  // Extract root (1-2 chars)
  const m = cleaned.match(/^([A-Ga-g])([#bB]?)(.*)$/);
  if (!m) return null;
  const rootRaw = m[1].toUpperCase() + (m[2] === "B" ? "b" : m[2]);
  const qualityRaw = m[3].trim();
  const parsedRoot = normalizeNote(rootRaw);
  if (!parsedRoot) return null;

  // Find best matching quality (longest match wins, case-insensitive for letters)
  const qualities = Object.keys(QUALITIES).sort((a, b) => b.length - a.length);
  const lower = qualityRaw.toLowerCase();
  let matched = "";
  for (const q of qualities) {
    if (q === "") continue;
    if (lower === q.toLowerCase() || qualityRaw === q) {
      matched = q;
      break;
    }
  }
  if (!matched && qualityRaw !== "") {
    // try partial
    for (const q of qualities) {
      if (q && lower.startsWith(q.toLowerCase())) {
        matched = q;
        break;
      }
    }
  }
  return { root: parsedRoot.note, rootIndex: parsedRoot.index, quality: matched };
}

export function noteAt(semitone: number, preferFlat = false): string {
  const i = ((semitone % 12) + 12) % 12;
  return preferFlat ? NOTES_FLAT[i] : NOTES_SHARP[i];
}

// Guitar: standard tuning EADGBE, low-to-high MIDI: E2(40) A2(45) D3(50) G3(55) B3(59) E4(64)
const GUITAR_OPEN = [40, 45, 50, 55, 59, 64];

// Generate a voicing across 6 strings. Returns array of fret numbers (-1 = mute).
function generateVoicing(chordPCs: number[], startFret: number): number[] {
  const voicing: number[] = [];
  const needed = new Set(chordPCs);
  const covered = new Set<number>();
  for (let s = 0; s < 6; s++) {
    let best = -1;
    for (let f = startFret; f < startFret + 5; f++) {
      const pc = (GUITAR_OPEN[s] + f) % 12;
      if (needed.has(pc)) {
        if (!covered.has(pc) || best === -1) {
          best = f;
          if (!covered.has(pc)) break;
        }
      }
    }
    if (best === -1) voicing.push(-1);
    else {
      voicing.push(best);
      covered.add((GUITAR_OPEN[s] + best) % 12);
    }
  }
  return covered.size >= Math.min(needed.size, 3) ? voicing : voicing.map(() => -1);
}
const OPEN_CHORDS: Record<string, number[][]> = {
  C_: [[-1, 3, 2, 0, 1, 0]],
  G_: [[3, 2, 0, 0, 0, 3]],
  D_: [[-1, -1, 0, 2, 3, 2]],
  A_: [[-1, 0, 2, 2, 2, 0]],
  E_: [[0, 2, 2, 1, 0, 0]],
  C_m: [[-1, 3, 5, 5, 4, 3]],
  G_m: [[3, 5, 5, 3, 3, 3]],
  D_m: [[-1, -1, 0, 2, 3, 1]],
  A_m: [[-1, 0, 2, 2, 1, 0]],
  E_m: [[0, 2, 2, 0, 0, 0]],
  B_m: [[-1, 2, 4, 4, 3, 2]],
};

function getStandardVoicings(root: string, quality: string, rootIndex: number): number[][] {
  const q = quality.toLowerCase();
  const isMinor = q === "m" || q === "min" || q === "minor";
  const isMajor = q === "" || q === "maj" || q === "major";

  const key = `${root}_${isMinor ? "m" : ""}`;
  const presets = OPEN_CHORDS[key];
  const voicings: number[][] = presets ? presets.map((v) => [...v]) : [];

  if (isMajor) {
    const fA = (rootIndex - 9 + 12) % 12;
    if (fA >= 0 && fA <= 10) {
      const vA = [-1, fA, fA + 2, fA + 2, fA + 2, fA];
      if (!voicings.some((v) => v.join(",") === vA.join(","))) voicings.push(vA);
    }
    const fE = (rootIndex - 4 + 12) % 12;
    if (fE >= 0 && fE <= 10) {
      const vE = [fE, fE + 2, fE + 2, fE + 1, fE, fE];
      if (!voicings.some((v) => v.join(",") === vE.join(","))) voicings.push(vE);
    }
  } else if (isMinor) {
    const fA = (rootIndex - 9 + 12) % 12;
    if (fA >= 0 && fA <= 10) {
      const vA = [-1, fA, fA + 2, fA + 2, fA + 1, fA];
      if (!voicings.some((v) => v.join(",") === vA.join(","))) voicings.push(vA);
    }
    const fE = (rootIndex - 4 + 12) % 12;
    if (fE >= 0 && fE <= 10) {
      const vE = [fE, fE + 2, fE + 2, fE, fE, fE];
      if (!voicings.some((v) => v.join(",") === vE.join(","))) voicings.push(vE);
    }
  }

  return voicings;
}

export interface ResolvedChord {
  name: string;
  root: string;
  qualityLabel: string;
  notes: string[];
  guitarVoicings: number[][];
  pianoKeys: number[]; // MIDI numbers across 2 octaves starting from C4(60)
}

export function resolveChord(input: string): ResolvedChord | null {
  const parsed = parseChord(input);
  if (!parsed) return null;
  const intervals = QUALITIES[parsed.quality] ?? [0, 4, 7];
  const pcs = intervals.map((i) => (parsed.rootIndex + i) % 12);
  const notes = pcs.map((pc) => noteAt(pc));

  const voicings = getStandardVoicings(parsed.root, parsed.quality, parsed.rootIndex);
  if (voicings.length === 0) {
    for (const start of [0, 3, 5, 7, 9]) {
      const v = generateVoicing(pcs, start);
      if (v.some((f) => f >= 0)) voicings.push(v);
      if (voicings.length >= 3) break;
    }
  }
  if (voicings.length === 0) voicings.push([-1, -1, -1, -1, -1, -1]);

  // Piano keys: 2 octaves from C4
  const pianoKeys: number[] = [];
  for (let k = 60; k < 60 + 24; k++) {
    if (pcs.includes(k % 12)) pianoKeys.push(k);
  }

  const displayQuality =
    parsed.quality === "min" || parsed.quality === "minor" ? "m" : parsed.quality;
  const displayName = parsed.root + displayQuality;

  const qualityLabel = QUALITY_LABEL[parsed.quality] ?? parsed.quality.toUpperCase();
  return {
    name: displayName,
    root: parsed.root,
    qualityLabel,
    notes,
    guitarVoicings: voicings.slice(0, 3),
    pianoKeys,
  };
}

// Note frequencies for tuner
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}
export function midiToNoteName(midi: number): string {
  const note = NOTES_SHARP[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}
