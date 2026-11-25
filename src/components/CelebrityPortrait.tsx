"use client";

import Image from "next/image";
import { useState } from "react";
import type { Celebrity } from "@/data/celebrities";

export default function CelebrityPortrait({ celebrity }: { celebrity: Celebrity }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
      {failed ? (
        <div className="flex h-full items-center justify-center p-4 text-center text-sm text-zinc-500">
          Portrait unavailable
        </div>
      ) : (
        <Image src={celebrity.imageSrc} alt={celebrity.name} fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" onError={() => setFailed(true)} unoptimized />
      )}
    </div>
  );
}
