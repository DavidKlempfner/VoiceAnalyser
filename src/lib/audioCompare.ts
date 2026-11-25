import { estimateF0Yin, fft, rms } from "./voiceAnalysis";

const SAMPLE_RATE = 16000;
const FRAME_SIZE = 640;
const FFT_SIZE = 1024;
const MEL_BANDS = 26;
const COEFFICIENTS = 13;
const MAX_FRAMES = 600;

export interface MimicScore {
  timbre: number;
  pitch: number;
  rhythm: number;
  overall: number;
}

interface Features {
  mfcc: number[][];
  pitch: number[][];
  energy: number[][];
}

function normalize(values: number[]): number[] {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const deviation = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  return values.map((value) => deviation < 1e-8 ? 0 : (value - mean) / deviation);
}

export function trimSilence(samples: Float32Array): Float32Array {
  const window = 320;
  const energies: number[] = [];
  for (let i = 0; i < samples.length; i += window) energies.push(rms(samples.subarray(i, i + window)));
  const peak = energies.reduce((maximum, energy) => Math.max(maximum, energy), 0);
  if (peak < 0.001) throw new Error("No audible speech detected. Please record again closer to the microphone.");
  const threshold = Math.max(0.001, peak * 0.05);
  const first = energies.findIndex((energy) => energy >= threshold);
  let last = energies.length - 1;
  while (last > first && energies[last] < threshold) last--;
  const trimmed = samples.subarray(first * window, Math.min(samples.length, (last + 1) * window));
  if (trimmed.length < SAMPLE_RATE * 0.25) throw new Error("The recording is too short to compare. Please try again.");
  return trimmed;
}

function mel(frequency: number): number {
  return 2595 * Math.log10(1 + frequency / 700);
}

function hz(melValue: number): number {
  return 700 * (10 ** (melValue / 2595) - 1);
}

const melBins = Array.from({ length: MEL_BANDS + 2 }, (_, index) =>
  Math.floor((FFT_SIZE + 1) * hz((mel(SAMPLE_RATE / 2) * index) / (MEL_BANDS + 1)) / SAMPLE_RATE),
);

function extractMfcc(frame: Float32Array): number[] {
  const real = new Float32Array(FFT_SIZE);
  const imaginary = new Float32Array(FFT_SIZE);
  for (let i = 0; i < frame.length; i++) {
    real[i] = frame[i] * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (frame.length - 1)));
  }
  fft(real, imaginary);
  const powers = Array.from({ length: FFT_SIZE / 2 + 1 }, (_, i) =>
    (real[i] ** 2 + imaginary[i] ** 2) / FFT_SIZE,
  );
  const bands = Array.from({ length: MEL_BANDS }, (_, band) => {
    const [left, center, right] = melBins.slice(band, band + 3);
    let energy = 0;
    for (let k = left; k < center; k++) energy += powers[k] * (k - left) / (center - left);
    for (let k = center; k < right; k++) energy += powers[k] * (right - k) / (right - center);
    return Math.log(Math.max(energy, 1e-12));
  });
  return Array.from({ length: COEFFICIENTS }, (_, coefficient) =>
    bands.reduce((sum, value, band) => sum + value * Math.cos(Math.PI * coefficient * (band + 0.5) / MEL_BANDS), 0),
  );
}

function extractFeatures(samples: Float32Array): Features {
  const hop = Math.max(320, Math.ceil((samples.length - FRAME_SIZE) / (MAX_FRAMES - 1)));
  const mfcc: number[][] = [];
  const pitches: number[] = [];
  const energies: number[] = [];
  for (let start = 0; start + FRAME_SIZE <= samples.length; start += hop) {
    const frame = samples.subarray(start, start + FRAME_SIZE);
    const energy = rms(frame);
    mfcc.push(extractMfcc(frame));
    energies.push(energy);
    // Reference clips can contain background music, so use a less restrictive YIN threshold.
    const pitch = energy >= 0.001 ? estimateF0Yin(frame, SAMPLE_RATE, 0.4) : null;
    if (pitch !== null) pitches.push(Math.log(pitch));
  }
  if (pitches.length < 5) throw new Error("Not enough clear voiced speech was detected. Please try again in a quieter place.");
  const normalizedCoefficients = Array.from({ length: COEFFICIENTS }, (_, i) => normalize(mfcc.map((frame) => frame[i])));
  return {
    mfcc: mfcc.map((_, frame) => normalizedCoefficients.map((coefficient) => coefficient[frame])),
    pitch: normalize(pitches).map((value) => [value]),
    energy: normalize(energies).map((value) => [value]),
  };
}

/** Returns the mean per-step distance along the lowest-cost DTW path. */
export function dtwDistance(a: number[][], b: number[][]): number {
  if (!a.length || !b.length) throw new Error("Not enough audio to compare.");
  let previous = new Float64Array(b.length + 1).fill(Infinity);
  let previousSteps = new Uint32Array(b.length + 1);
  previous[0] = 0;
  for (const left of a) {
    const current = new Float64Array(b.length + 1).fill(Infinity);
    const steps = new Uint32Array(b.length + 1);
    for (let j = 1; j <= b.length; j++) {
      let cost = previous[j - 1];
      let count = previousSteps[j - 1];
      if (previous[j] < cost) { cost = previous[j]; count = previousSteps[j]; }
      if (current[j - 1] < cost) { cost = current[j - 1]; count = steps[j - 1]; }
      const distance = Math.sqrt(left.reduce((sum, value, i) => sum + (value - b[j - 1][i]) ** 2, 0) / left.length);
      current[j] = cost + distance;
      steps[j] = count + 1;
    }
    previous = current;
    previousSteps = steps;
  }
  return previous[b.length] / previousSteps[b.length];
}

export function compareSamples(reference: Float32Array, recording: Float32Array): MimicScore {
  const original = extractFeatures(trimSilence(reference));
  const mimic = extractFeatures(trimSilence(recording));
  const score = (distance: number) => 10 * Math.exp(-distance);
  const timbre = score(dtwDistance(original.mfcc, mimic.mfcc));
  const pitch = score(dtwDistance(original.pitch, mimic.pitch));
  const rhythm = score(dtwDistance(original.energy, mimic.energy));
  return { timbre, pitch, rhythm, overall: 0.5 * timbre + 0.3 * pitch + 0.2 * rhythm };
}

async function resample(buffer: AudioBuffer): Promise<Float32Array> {
  if (buffer.duration > 120) throw new Error("Audio clips must be two minutes or shorter.");
  const length = Math.ceil(buffer.duration * SAMPLE_RATE);
  if (!length) throw new Error("The audio clip is empty.");
  const context = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
  const rendered = await context.startRendering();
  return rendered.getChannelData(0);
}

export async function compareAudio(audioSrc: string, recording: Blob, signal?: AbortSignal): Promise<MimicScore> {
  const response = await fetch(audioSrc, { signal });
  if (!response.ok) throw new Error("Could not load the celebrity voice clip. Please try again.");
  const [referenceData, recordingData] = await Promise.all([response.arrayBuffer(), recording.arrayBuffer()]);
  const context = new AudioContext();
  try {
    const [reference, user] = await Promise.all([
      context.decodeAudioData(referenceData),
      context.decodeAudioData(recordingData),
    ]);
    const [referenceSamples, userSamples] = await Promise.all([resample(reference), resample(user)]);
    if (signal?.aborted) throw new DOMException("Comparison cancelled.", "AbortError");
    return compareSamples(referenceSamples, userSamples);
  } finally {
    await context.close();
  }
}
