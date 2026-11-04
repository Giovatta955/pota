import { describe, it, expect } from "vitest";
import { parseMediaUrl, formatDuration } from "@/lib/media";

describe("parseMediaUrl", () => {
  it("YouTube in vari formati → embed senza cookie", () => {
    for (const u of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ"])
      expect(parseMediaUrl(u)).toEqual({ provider: "youtube", embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
  });
  it("Vimeo e Spotify", () => {
    expect(parseMediaUrl("https://vimeo.com/123456789")).toMatchObject({ provider: "vimeo", embedUrl: "https://player.vimeo.com/video/123456789" });
    expect(parseMediaUrl("https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk")).toMatchObject({ provider: "spotify", embedUrl: "https://open.spotify.com/embed/episode/4rOoJ6Egrf8K2IrywzwOMk" });
  });
  it("file audio/video solo da Supabase Storage", () => {
    expect(parseMediaUrl("https://abc.supabase.co/storage/v1/object/public/media/ep1.mp3")).toMatchObject({ provider: "file", fileKind: "audio" });
    expect(parseMediaUrl("https://abc.supabase.co/storage/v1/object/public/media/v.mp4")).toMatchObject({ provider: "file", fileKind: "video" });
    expect(parseMediaUrl("https://evil.example.com/ep1.mp3")).toBeNull();
  });
  it("rifiuta http, host sconosciuti, javascript: e URL malformati", () => {
    for (const u of ["http://youtu.be/dQw4w9WgXcQ", "https://evil.com/watch?v=dQw4w9WgXcQ", "javascript:alert(1)", "non un url", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=<script>"])
      expect(parseMediaUrl(u)).toBeNull();
  });
  it("durata", () => {
    expect(formatDuration(1830)).toBe("31 min");
    expect(formatDuration(null)).toBe("");
  });
});

import { fileKindFromPath, MEDIA_PATH_RE } from "@/lib/media";
describe("file caricati", () => {
  it("riconosce audio e video dall'estensione", () => {
    expect(fileKindFromPath("a/b.m4a")).toBe("audio");
    expect(fileKindFromPath("a/b.WAV")).toBe("audio");
    expect(fileKindFromPath("a/b.mp4")).toBe("video");
    expect(fileKindFromPath("a/b.exe")).toBeNull();
  });
  it("accetta solo percorsi nel formato atteso (niente path traversal)", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(MEDIA_PATH_RE.test(`demo-sub/${id}.mp3`)).toBe(true);
    expect(MEDIA_PATH_RE.test(`../x/${id}.mp3`)).toBe(false);
    expect(MEDIA_PATH_RE.test(`demo/${id}.html`)).toBe(false);
  });
});
