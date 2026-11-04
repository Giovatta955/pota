"use client";
import { useState } from "react";
import type { ParsedMedia } from "@/lib/media";

/** I player di terzi (YouTube, Vimeo, Spotify) si caricano solo dopo il clic: prima non partono cookie né richieste esterne. */
export function MediaPlayer({ media, title }: { media: ParsedMedia; title: string }) {
  const [on, setOn] = useState(false);
  if (media.provider === "file")
    return media.fileKind === "audio"
      ? <audio controls preload="none" src={media.src} className="w-full" aria-label={title} />
      : <video controls preload="none" src={media.src} className="w-full rounded-lg" aria-label={title} />;
  if (!on)
    return (
      <div className="rounded-lg bg-slate-50 p-4 text-sm">
        <button onClick={() => setOn(true)} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">▶ Riproduci</button>
        <p className="mt-2 text-xs text-slate-500">Il lettore è fornito da {media.provider === "youtube" ? "YouTube" : media.provider === "vimeo" ? "Vimeo" : "Spotify"} e può impostare cookie propri quando lo avvii.</p>
      </div>
    );
  return (
    <iframe src={media.embedUrl} title={title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin"
      className={`w-full rounded-lg border-0 ${media.provider === "spotify" ? "h-40" : "aspect-video"}`} />
  );
}
