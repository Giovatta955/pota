"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addMediaFile } from "@/app/admin-actions";
import { MEDIA_MAX_BYTES, extOf } from "@/lib/media";

type Sub = { id: string; label: string };
const input = "w-full rounded border border-slate-300 px-2 py-1 text-sm";

function readDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const el = document.createElement(file.type.startsWith("video") ? "video" : "audio");
    const url = URL.createObjectURL(file);
    el.preload = "metadata";
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(el.duration) ? Math.round(el.duration) : undefined); };
    el.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
    el.src = url;
  });
}

export function MediaUploader({ subtopics }: { subtopics: Sub[] }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file") as File;
    const subtopic = String(fd.get("subtopic_id"));
    const ext = extOf(file.name);
    if (!["mp3", "m4a", "wav", "ogg", "mp4", "webm"].includes(ext)) { setState("err"); return setMsg("Formato non supportato: usa mp3, m4a, wav, ogg, mp4 o webm."); }
    if (file.size > MEDIA_MAX_BYTES) { setState("err"); return setMsg(`File troppo grande (${(file.size / 1048576).toFixed(0)} MB): il limite è 50 MB. Comprimilo o, con il piano Pro di Supabase, alza il limite.`); }
    setState("busy"); setMsg("Caricamento in corso…");
    const path = `${subtopic}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("media").upload(path, file, { contentType: file.type || undefined });
    if (error) { setState("err"); return setMsg(`Upload fallito: ${error.message}`); }
    try {
      await addMediaFile({
        subtopic_id: subtopic, kind: fd.get("kind") as "podcast" | "video", title: String(fd.get("title")), path,
        description: String(fd.get("description") || "") || undefined, duration_s: await readDuration(file),
      });
      setState("ok"); setMsg("Caricato ✔"); form.reset(); router.refresh();
    } catch (err) {
      setState("err"); setMsg(err instanceof Error ? err.message : "Errore nel salvataggio");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold">Carica file (es. da NotebookLM)</h2>
      <select name="subtopic_id" required className={input} aria-label="Sottoargomento">
        {subtopics.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <div className="flex gap-2">
        <select name="kind" className={input} aria-label="Tipo"><option value="podcast">Podcast</option><option value="video">Video</option></select>
        <input name="file" type="file" required accept="audio/*,video/mp4,video/webm,.m4a,.wav,.mp3,.ogg" className={input} />
      </div>
      <input name="title" required placeholder="Titolo" className={input} />
      <textarea name="description" rows={2} placeholder="Descrizione (opzionale)" className={input} />
      <button disabled={state === "busy"} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Carica</button>
      {msg && <p role={state === "err" ? "alert" : "status"} className={`text-sm ${state === "err" ? "text-red-700" : "text-slate-600"}`}>{msg}</p>}
      <p className="text-xs text-slate-500">Il file resta privato: gli utenti lo ascoltano solo se hanno accesso al sottoargomento (gratis o abbonamento). Limite 50 MB per file.</p>
    </form>
  );
}
