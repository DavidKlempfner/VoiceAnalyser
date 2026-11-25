"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Celebrity } from "@/data/celebrities";
import { compareAudio, type MimicScore } from "@/lib/audioCompare";
import CelebrityPortrait from "./CelebrityPortrait";
import VoiceRecorder from "./VoiceRecorder";

function verdict(score: number): string {
  if (score >= 8) return "Spot on! You might have a stunt double career ahead.";
  if (score >= 6) return "Nice impression! You captured some of that star quality.";
  if (score >= 4) return "A promising take! Listen again and try matching the delivery.";
  return "A voice all your own! Give the impression another go.";
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm font-medium"><span>{label}</span><span>{score.toFixed(1)} / 10</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div className="h-full rounded-full bg-violet-600" style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );
}

export default function MimicChallenge({ celebrity }: { celebrity: Celebrity }) {
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState<"idle" | "comparing" | "results">("idle");
  const [score, setScore] = useState<MimicScore | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const originalRef = useRef<HTMLAudioElement>(null);
  const recordingRef = useRef<HTMLAudioElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const original = originalRef.current;
    return () => {
      controllerRef.current?.abort();
      original?.pause();
    };
  }, []);

  useEffect(() => {
    return () => { if (recordingUrl) URL.revokeObjectURL(recordingUrl); };
  }, [recordingUrl]);

  useEffect(() => {
    const audio = recordingRef.current;
    return () => { audio?.pause(); };
  }, [status]);

  const togglePlayback = async () => {
    const audio = originalRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      setError(null);
      await audio.play();
    } catch {
      setError("Could not play the celebrity voice clip. Please try again.");
    }
  };

  const handleRecorded = useCallback(async (blob: Blob) => {
    originalRef.current?.pause();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setScore(null);
    setRecordingUrl(URL.createObjectURL(blob));
    setStatus("comparing");
    try {
      const result = await compareAudio(celebrity.audioSrc, blob, controller.signal);
      if (!controller.signal.aborted) {
        setScore(result);
        setStatus("results");
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Could not compare the recordings. Please try again.");
        setStatus("idle");
      }
    }
  }, [celebrity.audioSrc]);

  const reset = () => {
    setRecordingUrl(null);
    setScore(null);
    setError(null);
    setStatus("idle");
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
      <nav className="flex flex-wrap gap-5 text-sm font-medium text-violet-600 dark:text-violet-400">
        <Link href="/" className="hover:underline">← Home</Link>
        <Link href="/mimic" className="hover:underline">← Back to Celebrities</Link>
      </nav>
      <header className="flex items-center gap-5">
        <div className="w-28 shrink-0"><CelebrityPortrait celebrity={celebrity} /></div>
        <div><p className="text-sm font-semibold text-violet-600 dark:text-violet-400">Mimic challenge</p><h1 className="text-3xl font-bold">{celebrity.name}</h1></div>
      </header>
      <audio ref={originalRef} src={celebrity.audioSrc} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError("Could not load the celebrity voice clip.")} controls={status === "results"} className={status === "results" ? "w-full" : "hidden"} aria-label={`${celebrity.name}'s voice`} />
      {status !== "results" && (
        <button onClick={togglePlayback} disabled={recording} className="rounded-full border border-violet-600 px-6 py-3 font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-950">
          {playing ? `Pause ${celebrity.name}'s voice` : `Play ${celebrity.name}'s voice`}
        </button>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
      {status === "idle" && <VoiceRecorder mode="mimic" onRecorded={handleRecorded} onRecordingStart={() => { originalRef.current?.pause(); setRecording(true); }} onRecordingStop={() => setRecording(false)} />}
      {status === "comparing" && <p role="status" className="animate-pulse text-zinc-500">Comparing your impression…</p>}
      {status === "results" && score && recordingUrl && (
        <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div><h2 className="text-lg font-semibold">Your score</h2><p className="text-4xl font-bold text-violet-600 dark:text-violet-400">{score.overall.toFixed(1)} / 10</p><p className="mt-2 text-zinc-600 dark:text-zinc-400">{verdict(score.overall)}</p></div>
          <ScoreBar label="Timbre / Accent" score={score.timbre} />
          <ScoreBar label="Pitch / Intonation" score={score.pitch} />
          <ScoreBar label="Rhythm" score={score.rhythm} />
          <div><p className="mb-2 text-sm font-medium">Your recording</p><audio ref={recordingRef} src={recordingUrl} controls className="w-full" aria-label="Your recording" /></div>
          <p className="text-xs text-zinc-500">Scores are approximate acoustic similarities, not a judgment of your voice or accent. Audio is processed locally.</p>
          <button onClick={reset} className="rounded-full bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500">Try again</button>
        </section>
      )}
    </main>
  );
}
