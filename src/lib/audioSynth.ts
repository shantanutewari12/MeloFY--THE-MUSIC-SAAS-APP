let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

// Function to play click sound for buttons (global tactile feedback)
export function playClickSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Quick organic pop/click
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.error("Error playing click sound:", e);
  }
}

// Function to play PWA install button sound (musical note tone)
export function playInstallSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Musical arpeggio chime (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  } catch (e) {
    console.error("Error playing install sound:", e);
  }
}

// Piano sound synthesis for a single note
function playPianoNote(ctx: AudioContext, midi: number, startTime: number, volumeScale = 1.0) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const now = startTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();

  const gain1 = ctx.createGain();
  const gain2 = ctx.createGain();
  const gain3 = ctx.createGain();

  const masterGain = ctx.createGain();

  // Fundamental (Sine)
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(freq, now);
  gain1.gain.setValueAtTime(0.35, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

  // 2nd Harmonic (Sine, octave above)
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2, now);
  gain2.gain.setValueAtTime(0.12, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

  // 3rd Harmonic (Sine, octave + fifth above)
  osc3.type = "sine";
  osc3.frequency.setValueAtTime(freq * 3, now);
  gain3.gain.setValueAtTime(0.06, now);
  gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  osc1.connect(gain1);
  osc2.connect(gain2);
  osc3.connect(gain3);

  gain1.connect(masterGain);
  gain2.connect(masterGain);
  gain3.connect(masterGain);

  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.35 * volumeScale, now + 0.015); // piano strike attack
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

  masterGain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc3.start(now);

  osc1.stop(now + 2.2);
  osc2.stop(now + 2.2);
  osc3.stop(now + 2.2);
}

// Guitar sound synthesis for a single note (plucked string)
function playGuitarNote(ctx: AudioContext, midi: number, startTime: number, volumeScale = 1.0) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const now = startTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(freq, now);

  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(freq, now);
  const osc2Gain = ctx.createGain();
  osc2Gain.gain.setValueAtTime(0.04, now); // string buzz harmonic
  osc2.connect(osc2Gain);

  osc1.connect(filter);
  osc2Gain.connect(filter);

  // Pluck sweep envelope
  filter.type = "lowpass";
  filter.Q.setValueAtTime(2.5, now);
  filter.frequency.setValueAtTime(freq * 5, now);
  filter.frequency.exponentialRampToValueAtTime(freq * 1.3, now + 0.25);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.32 * volumeScale, now + 0.008); // pluck attack
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8); // decay

  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);

  osc1.stop(now + 1.8);
  osc2.stop(now + 1.8);
}

// Play Piano Chord polyphonically (all notes together)
export function playPianoChord(midiNotes: number[]) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const volumeScale = 2.4 / Math.max(3, midiNotes.length);
    midiNotes.forEach((midi) => {
      playPianoNote(ctx, midi, now, volumeScale);
    });
  } catch (e) {
    console.error("Error playing piano chord:", e);
  }
}

// Play Guitar Chord strummed from low to high strings
export function playGuitarChord(voicing: number[]) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const GUITAR_OPEN = [40, 45, 50, 55, 59, 64]; // E2, A2, D3, G3, B3, E4

    const activeStrings = voicing.filter((f) => f !== -1).length;
    const volumeScale = 3.2 / Math.max(3, activeStrings);

    let strumDelay = 0;
    voicing.forEach((fret, stringIdx) => {
      if (fret === -1) return; // skip muted strings
      const midi = GUITAR_OPEN[stringIdx] + fret;
      playGuitarNote(ctx, midi, now + strumDelay, volumeScale);
      strumDelay += 0.045; // 45ms delay per string for standard strum
    });
  } catch (e) {
    console.error("Error playing guitar chord:", e);
  }
}
