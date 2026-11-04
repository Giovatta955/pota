import { createClient } from "@/lib/supabase/server";
import { addMedia, deleteMedia } from "@/app/admin-actions";

export const metadata = { title: "Admin · Podcast e video", robots: { index: false } };
const input = "w-full rounded border border-slate-300 px-2 py-1 text-sm";

export default async function AdminMedia() {
  const db = await createClient();
  const [{ data: subs }, { data: media }] = await Promise.all([
    db.from("subtopics").select("id,title,topic_id").order("topic_id").order("position"),
    db.from("media").select("id,subtopic_id,kind,title,url").order("created_at", { ascending: false }),
  ]);
  const title = new Map((subs ?? []).map((s) => [s.id as string, s.title as string]));
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Podcast e video</h1>
      <form action={addMedia} className="space-y-2 rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold">Aggiungi</h2>
        <select name="subtopic_id" required className={input} aria-label="Sottoargomento">
          {(subs ?? []).map((s) => <option key={s.id as string} value={s.id as string}>{s.topic_id as string} › {s.title as string}</option>)}
        </select>
        <div className="flex gap-2">
          <select name="kind" className={input} aria-label="Tipo"><option value="podcast">Podcast</option><option value="video">Video</option></select>
          <input name="minutes" type="number" min={0} placeholder="Durata (min)" className={input} />
          <input name="position" type="number" min={0} placeholder="Ordine" className={input} />
        </div>
        <input name="title" required placeholder="Titolo" className={input} />
        <input name="url" required type="url" placeholder="https://… (YouTube, Vimeo, Spotify o file .mp3/.mp4 su Supabase Storage)" className={input} />
        <textarea name="description" rows={2} placeholder="Descrizione (opzionale)" className={input} />
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Aggiungi</button>
        <p className="text-xs text-slate-500">Usa solo materiale tuo o con licenza. I video di YouTube/Vimeo/Spotify restano raggiungibili da chiunque abbia il link: il paywall protegge la pagina, non il file sulla piattaforma. Per file davvero riservati usa Supabase Storage.</p>
      </form>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
        {(media ?? []).map((m) => (
          <li key={m.id as string} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>{m.kind === "podcast" ? "🎧" : "🎬"} <b>{m.title as string}</b> <span className="text-slate-500">— {title.get(m.subtopic_id as string)}</span></span>
            <form action={deleteMedia}><input type="hidden" name="id" value={m.id as string} /><button className="text-red-700 underline">Elimina</button></form>
          </li>
        ))}
        {!(media ?? []).length && <li className="px-4 py-3 text-slate-500">Nessun contenuto ancora.</li>}
      </ul>
    </main>
  );
}
