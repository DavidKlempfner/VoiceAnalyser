"use client";

import { useEffect, useRef } from "react";

interface Props {
  analyser: AnalyserNode | null;
}

export default function FrequencyVisualizer({ analyser }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      if (analyser && data) {
        analyser.getByteFrequencyData(data);
        const bars = 64;
        const usable = Math.floor(data.length * 0.5); // up to ~11 kHz
        const step = Math.max(1, Math.floor(usable / bars));
        const barW = width / bars;
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
          const v = sum / step / 255;
          const h = Math.max(2, v * height);
          ctx.fillStyle = `hsl(${260 - v * 80}, 85%, ${45 + v * 20}%)`;
          ctx.fillRect(i * barW + 1, height - h, barW - 2, h);
        }
        raf = requestAnimationFrame(draw);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={160}
      aria-label="Live frequency spectrum"
      className="h-40 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900"
    />
  );
}
