// YIN pitch detection in a Web Worker.
// Receives Float32Array audio buffers + sample rate, returns detected frequency.

interface YinMsg {
  buffer: Float32Array;
  sampleRate: number;
}

function yin(buffer: Float32Array, sampleRate: number, threshold = 0.1): number {
  const bufferSize = buffer.length;
  const halfSize = Math.floor(bufferSize / 2);
  const yinBuffer = new Float32Array(halfSize);

  // Difference function
  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    yinBuffer[tau] = sum;
  }

  // Cumulative mean normalized difference
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] = (yinBuffer[tau] * tau) / runningSum;
  }

  // Absolute threshold
  let tau = -1;
  for (let t = 2; t < halfSize; t++) {
    if (yinBuffer[t] < threshold) {
      while (t + 1 < halfSize && yinBuffer[t + 1] < yinBuffer[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) return -1;

  // Parabolic interpolation
  const x0 = tau > 0 ? tau - 1 : tau;
  const x2 = tau < halfSize - 1 ? tau + 1 : tau;
  let betterTau = tau;
  if (x0 !== tau && x2 !== tau) {
    const s0 = yinBuffer[x0],
      s1 = yinBuffer[tau],
      s2 = yinBuffer[x2];
    betterTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }
  return sampleRate / betterTau;
}

self.onmessage = (e: MessageEvent<YinMsg>) => {
  const { buffer, sampleRate } = e.data;
  const freq = yin(buffer, sampleRate);
  (self as unknown as Worker).postMessage({ freq });
};
