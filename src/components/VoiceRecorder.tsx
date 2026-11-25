"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FrequencyVisualizer from "./FrequencyVisualizer";

interface Props {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
  mode?: "analysis" | "mimic";
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

function describeError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError")
      return "Microphone access was denied. Allow microphone permission in your browser and try again.";
    if (err.name === "NotFoundError") return "No microphone was found on this device.";
  }
  return "Could not start recording. Please check your microphone and try again.";
}

export default function VoiceRecorder({ onRecorded, disabled, mode = "analysis", onRecordingStart, onRecordingStop }: Props) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [seconds, setSeconds] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(false);
  const startingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== "closed") void ctxRef.current.close();
    ctxRef.current = null;
    setAnalyser(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const rec = recorderRef.current;
      if (rec) {
        rec.onstop = null;
        rec.onerror = null;
        if (rec.state !== "inactive") rec.stop();
      }
      cleanup();
    };
  }, [cleanup]);

  const start = async () => {
    if (startingRef.current) return;
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support audio recording.");
      return;
    }
    startingRef.current = true;
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const audioContext = new AudioContext();
      ctxRef.current = audioContext;
      const node = audioContext.createAnalyser();
      node.fftSize = 2048;
      node.smoothingTimeConstant = 0.8;
      audioContext.createMediaStreamSource(stream).connect(node);
      setAnalyser(node);

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        cleanup();
        setRecording(false);
        onRecordingStop?.();
        if (blob.size) onRecorded(blob);
        else setError("The recording was empty. Please try again.");
      };
      recorder.onerror = () => {
        recorder.onstop = null;
        cleanup();
        setRecording(false);
        onRecordingStop?.();
        setError("Recording failed. Please check your microphone and try again.");
      };
      recorderRef.current = recorder;
      recorder.start();
      onRecordingStart?.();
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setRecording(true);
    } catch (err) {
      cleanup();
      if (mountedRef.current) setError(describeError(err));
    } finally {
      startingRef.current = false;
      if (mountedRef.current) setStarting(false);
    }
  };

  const stop = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  };

  return (
    <div className="space-y-6">
      {mode === "analysis" && <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
          Read aloud for 5–10 seconds
        </p>
        <p className="mt-2 text-lg leading-relaxed">
          “The rainbow is a division of white light into many beautiful colors.”
        </p>
      </div>}
      {mode === "mimic" && <p className="text-sm text-zinc-600 dark:text-zinc-400">Listen to the clip, then mimic the same words and delivery.</p>}

      <FrequencyVisualizer analyser={analyser} />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        {recording ? (
          <button
            onClick={stop}
            className="rounded-full bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-500"
          >
            {mode === "mimic" ? "Stop Recording" : "Stop recording"}
          </button>
        ) : (
          <button
            onClick={start}
            disabled={disabled || starting}
            className="rounded-full bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {starting ? "Starting…" : mode === "mimic" ? "Mimic" : "Start recording"}
          </button>
        )}
        {recording && (
          <span className="font-mono text-sm text-zinc-500 dark:text-zinc-400">● {seconds}s</span>
        )}
      </div>
    </div>
  );
}
