"use client";

import type { VoiceAnalysisResult } from "@/lib/voiceAnalysis";

interface Props {
  result: VoiceAnalysisResult;
  audioUrl: string | null;
}

function Card({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {value} <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">{unit}</span>
      </p>
    </div>
  );
}

export default function AnalysisResults({ result, audioUrl }: Props) {
  const masc = Math.round(result.masculinePercent);
  const fem = 100 - masc;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 flex justify-between text-sm font-semibold">
          <span className="text-sky-600 dark:text-sky-400">Masculine {masc}%</span>
          <span className="text-pink-600 dark:text-pink-400">Feminine {fem}%</span>
        </div>
        <div
          className="flex h-5 overflow-hidden rounded-full"
          role="img"
          aria-label={`${masc}% masculine, ${fem}% feminine`}
        >
          <div className="bg-sky-500 transition-all" style={{ width: `${masc}%` }} />
          <div className="bg-pink-500 transition-all" style={{ width: `${fem}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card label="Median pitch" value={result.medianPitchHz.toFixed(0)} unit="Hz" />
        <Card
          label="Pitch range (10–90%)"
          value={`${result.pitchP10Hz.toFixed(0)}–${result.pitchP90Hz.toFixed(0)}`}
          unit="Hz"
        />
        <Card label="Spectral brightness" value={result.meanSpectralCentroidHz.toFixed(0)} unit="Hz" />
        <Card label="Voiced duration" value={result.voicedDurationSec.toFixed(1)} unit="s" />
      </div>

      {audioUrl && <audio controls src={audioUrl} className="w-full" />}

      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        This is a heuristic acoustic estimate based only on pitch and spectral resonance. Natural human voices
        overlap significantly across gender presentations, so this result says nothing definitive about anyone’s
        identity.
      </p>
    </div>
  );
}
