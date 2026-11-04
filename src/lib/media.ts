// Riconoscimento e validazione degli URL di podcast/video. Solo host noti: niente iframe arbitrari.
export type ParsedMedia =
  | { provider: "youtube" | "vimeo" | "spotify"; embedUrl: string }
  | { provider: "file"; fileKind: "audio" | "video"; src: string };

const AUDIO = /\.(mp3|m4a|wav|ogg)$/i;
const VIDEO = /\.(mp4|webm)$/i;

export function parseMediaUrl(raw: string): ParsedMedia | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const id = u.pathname === "/watch" ? u.searchParams.get("v") : /^\/(embed|shorts)\/([\w-]{6,20})$/.exec(u.pathname)?.[2];
    return id && /^[\w-]{6,20}$/.test(id) ? { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return /^[\w-]{6,20}$/.test(id) ? { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === "vimeo.com") {
    const id = /^\/(\d{5,12})$/.exec(u.pathname)?.[1];
    return id ? { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (host === "open.spotify.com") {
    const m = /^\/(episode|show)\/([A-Za-z0-9]{10,30})$/.exec(u.pathname);
    return m ? { provider: "spotify", embedUrl: `https://open.spotify.com/embed/${m[1]}/${m[2]}` } : null;
  }
  // File propri su Supabase Storage (nessun cookie di terzi)
  if (host.endsWith(".supabase.co")) {
    if (AUDIO.test(u.pathname)) return { provider: "file", fileKind: "audio", src: u.toString() };
    if (VIDEO.test(u.pathname)) return { provider: "file", fileKind: "video", src: u.toString() };
  }
  return null;
}

export const formatDuration = (s: number | null) => (s ? `${Math.max(1, Math.round(s / 60))} min` : "");

// ---------- File caricati su Supabase Storage (bucket privato "media") ----------
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
export const MEDIA_PATH_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[0-9a-f-]{36}\.(mp3|m4a|wav|ogg|mp4|webm)$/;

export function fileKindFromPath(path: string): "audio" | "video" | null {
  const ext = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase();
  if (!ext) return null;
  if (["mp3", "m4a", "wav", "ogg"].includes(ext)) return "audio";
  if (["mp4", "webm"].includes(ext)) return "video";
  return null;
}
export const extOf = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "";
