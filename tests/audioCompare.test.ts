import { strict as assert } from "node:assert";
import { test } from "node:test";
import { compareSamples, dtwDistance, trimSilence } from "../src/lib/audioCompare";

function voice(): Float32Array {
  const samples = new Float32Array(32000);
  let phase = 0;
  for (let i = 3200; i < 28800; i++) {
    const time = i / 16000;
    phase += 2 * Math.PI * (150 + 30 * Math.sin(time * 5)) / 16000;
    const amplitude = 0.1 + 0.08 * Math.sin(time * 9) ** 2;
    samples[i] = amplitude * (Math.sin(phase) + 0.3 * Math.sin(2 * phase));
  }
  return samples;
}

test("trims quiet edges and rejects silence or short audio", () => {
  assert.ok(trimSilence(voice()).length < 32000);
  assert.throws(() => trimSilence(new Float32Array(16000)), /No audible speech/);
  assert.throws(() => trimSilence(new Float32Array(1000).fill(0.1)), /too short/);
});

test("DTW aligns repeated frames without a speed penalty", () => {
  assert.equal(dtwDistance([[0], [1], [2]], [[0], [0], [1], [2], [2]]), 0);
  assert.ok(dtwDistance([[0], [1]], [[2], [3]]) > 0);
});

test("identical voiced clips score ten across all dimensions", () => {
  const samples = voice();
  const score = compareSamples(samples, samples);
  assert.ok(Math.abs(score.overall - 10) < 1e-8);
  assert.ok(Math.abs(score.timbre - 10) < 1e-8);
  assert.ok(Math.abs(score.pitch - 10) < 1e-8);
  assert.ok(Math.abs(score.rhythm - 10) < 1e-8);
});

test("rejects recordings without reliable voiced pitch", () => {
  assert.throws(() => compareSamples(voice(), new Float32Array(16000).fill(0.1)), /voiced speech/);
});
