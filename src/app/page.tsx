"use client";

import { useCallback, useEffect, useState } from "react";
import AnalysisResults from "@/components/AnalysisResults";
import VoiceRecorder from "@/components/VoiceRecorder";
import { analyzeBlob, type VoiceAnalysisResult } from "@/lib/voiceAnalysis";

type Status = "idle" | "analyzing" | "results";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<VoiceAnalysisResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleRecorded = useCallback(async (blob: Blob) => {
    setError(null);
    setAudioUrl(URL.createObjectURL(blob));
    setStatus("analyzing");
    try {
      setResult(await analyzeBlob(blob));
      setStatus("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setStatus("idle");
    }
  }, []);

  const reset = () => {
    setResult(null);
    setAudioUrl(null);
    setError(null);
    setStatus("idle");
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Voice Analyser</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Estimate perceived vocal masculinity/femininity from pitch and spectral brightness.
        </p>
        <p className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          🔒 Audio is processed locally in memory and never leaves your device.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {status === "idle" && <VoiceRecorder onRecorded={handleRecorded} />}

      {status === "analyzing" && (
        <p className="animate-pulse text-center text-zinc-500 dark:text-zinc-400">Analyzing your voice…</p>
      )}

      {status === "results" && result && (
        <>
          <AnalysisResults result={result} audioUrl={audioUrl} />
          <button
            onClick={reset}
            className="rounded-full bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500"
          >
            Record Again
          </button>
        </>
      )}
    </main>
  );
}
