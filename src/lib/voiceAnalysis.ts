export const MIN_F0 = 65;
export const MAX_F0 = 350;
export const FRAME_MS = 40;
export const HOP_MS = 20;
const FFT_SIZE = 2048;
const YIN_THRESHOLD = 0.15;
const NEUTRAL_F0 = 165;
const NEUTRAL_CENTROID = 2000;
const PITCH_WEIGHT = 3;
const BRIGHTNESS_WEIGHT = 0.8;

export interface VoiceAnalysisResult {
  medianPitchHz: number;
  pitchP10Hz: number;
  pitchP90Hz: number;
  pitchRangeHz: number;
  meanSpectralCentroidHz: number;
  voicedDurationSec: number;
  masculinePercent: number;
  femininePercent: number;
}

export class NoVoiceDetectedError extends Error {
  constructor() {
    super("No clear voiced speech was detected. Please try again in a quieter place, closer to the microphone.");
    this.name = "NoVoiceDetectedError";
  }
}

export function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / (frame.length || 1));
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (Math.min(100, Math.max(0, p)) / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** YIN pitch detector. Returns f0 in Hz, or null if no reliable pitch is found. */
export function estimateF0Yin(frame: Float32Array, sampleRate: number, threshold = YIN_THRESHOLD): number | null {
  const tauMin = Math.max(2, Math.floor(sampleRate / MAX_F0));
  const tauMax = Math.ceil(sampleRate / MIN_F0);
  const w = frame.length - tauMax;
  if (w < tauMax / 2) return null;

  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < w; i++) {
      const diff = frame[i] - frame[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  // cumulative mean normalised difference
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    cmnd[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }

  let tauEstimate = -1;
  for (let tau = tauMin; tau < tauMax; tau++) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 < tauMax && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate < 0) return null;

  // parabolic interpolation
  let better = tauEstimate;
  if (tauEstimate > 1 && tauEstimate < tauMax) {
    const s0 = cmnd[tauEstimate - 1];
    const s1 = cmnd[tauEstimate];
    const s2 = cmnd[tauEstimate + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) better = tauEstimate + (s2 - s0) / denom;
  }
  const f0 = sampleRate / better;
  return f0 >= MIN_F0 && f0 <= MAX_F0 ? f0 : null;
}

/** In-place iterative radix-2 FFT. */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** Spectral centroid (Hz) of a frame using a Hamming window and zero-padded FFT. */
export function spectralCentroid(frame: Float32Array, sampleRate: number): number {
  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  const n = Math.min(frame.length, FFT_SIZE);
  for (let i = 0; i < n; i++) {
    re[i] = frame[i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  fft(re, im);
  let weighted = 0;
  let total = 0;
  const binHz = sampleRate / FFT_SIZE;
  for (let k = 1; k < FFT_SIZE / 2; k++) {
    const mag = Math.hypot(re[k], im[k]);
    weighted += mag * k * binHz;
    total += mag;
  }
  return total > 0 ? weighted / total : 0;
}

/** Maps pitch and brightness to a 0-100 masculinity estimate via a logistic curve. */
export function scoreMasculinity(medianF0: number, centroidHz: number): number {
  const pitchTerm = -Math.log2(medianF0 / NEUTRAL_F0) * PITCH_WEIGHT;
  const brightnessTerm = (-(centroidHz - NEUTRAL_CENTROID) / 1000) * BRIGHTNESS_WEIGHT;
  return sigmoid(pitchTerm + brightnessTerm) * 100;
}

export function analyzeSamples(samples: Float32Array, sampleRate: number): VoiceAnalysisResult {
  const frameLen = Math.round((FRAME_MS / 1000) * sampleRate);
  const hop = Math.round((HOP_MS / 1000) * sampleRate);
  const energies: number[] = [];
  const starts: number[] = [];
  for (let s = 0; s + frameLen <= samples.length; s += hop) {
    starts.push(s);
    energies.push(rms(samples.subarray(s, s + frameLen)));
  }
  if (starts.length === 0) throw new NoVoiceDetectedError();

  // adaptive threshold: above the noise floor, and a fraction of the loud-speech level
  const noiseFloor = percentile(energies, 10);
  const loud = percentile(energies, 90);
  const threshold = Math.max(Math.min(noiseFloor * 2, loud * 0.5), loud * 0.15, 1e-3);

  const pitches: number[] = [];
  const centroids: number[] = [];
  for (let i = 0; i < starts.length; i++) {
    if (energies[i] < threshold) continue;
    const frame = samples.subarray(starts[i], starts[i] + frameLen);
    const f0 = estimateF0Yin(frame, sampleRate);
    if (f0 === null) continue;
    pitches.push(f0);
    centroids.push(spectralCentroid(frame, sampleRate));
  }
  if (pitches.length < 5) throw new NoVoiceDetectedError();

  const medianPitchHz = percentile(pitches, 50);
  const pitchP10Hz = percentile(pitches, 10);
  const pitchP90Hz = percentile(pitches, 90);
  const meanSpectralCentroidHz = mean(centroids);
  const masculinePercent = scoreMasculinity(medianPitchHz, meanSpectralCentroidHz);
  return {
    medianPitchHz,
    pitchP10Hz,
    pitchP90Hz,
    pitchRangeHz: pitchP90Hz - pitchP10Hz,
    meanSpectralCentroidHz,
    voicedDurationSec: (pitches.length * HOP_MS) / 1000,
    masculinePercent,
    femininePercent: 100 - masculinePercent,
  };
}

export async function analyzeBlob(blob: Blob): Promise<VoiceAnalysisResult> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const buffer = await audioContext.decodeAudioData(arrayBuffer);
    const mono = new Float32Array(buffer.length);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const ch = buffer.getChannelData(c);
      for (let i = 0; i < ch.length; i++) mono[i] += ch[i] / buffer.numberOfChannels;
    }
    return analyzeSamples(mono, buffer.sampleRate);
  } finally {
    await audioContext.close();
  }
}
