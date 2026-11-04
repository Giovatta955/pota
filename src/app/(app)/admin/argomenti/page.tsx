import { createClient } from "@/lib/supabase/server";
import { saveSubtopic, saveTopic } from "@/app/admin-actions";

export const metadata = { title: "Admin · Argomenti", robots: { index: false } };
const input = "rounded border border-slate-300 px-2 py-1 text-sm";

export default async function AdminTopics() {
  const db = await createClient();
  const [{ data: topics }, { data: subs }] = await Promise.all([
    db.from("topics").select("*").order("position"),
    db.from("subtopics").select("*").order("position"),
  ]);
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <h1 className="text-2xl font-bold">Argomenti</h1>
      <p className="text-sm text-slate-600">Id = identificativo nell&apos;URL (minuscole e trattini), non si cambia dopo la creazione. Posizione = ordine. Peso = quota nell&apos;esame simulato.</p>

      {(topics ?? []).map((t) => (
        <section key={t.id as string} className="space-y-3 rounded-xl border border-slate-200 p-4">
          <form action={saveTopic} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={t.id as string} />
            <label className="text-xs">Titolo<br /><input name="title" defaultValue={t.title as string} className={`${input} w-56`} /></label>
            <label className="text-xs">Pos.<br /><input name="position" type="number" defaultValue={t.position as number} className={`${input} w-16`} /></label>
            <label className="text-xs">Peso<br /><input name="exam_weight" type="number" step="0.1" defaultValue={Number(t.exam_weight)} className={`${input} w-16`} /></label>
            <button className="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-semibold text-white">Salva</button>
            <code className="text-xs text-slate-500">{t.id as string}</code>
          </form>
          <ul className="space-y-2 border-t border-slate-100 pt-3">
            {(subs ?? []).filter((s) => s.topic_id === t.id).map((s) => (
              <li key={s.id as string}>
                <form action={saveSubtopic} className="flex flex-wrap items-end gap-2 text-sm">
                  <input type="hidden" name="id" value={s.id as string} /><input type="hidden" name="topic_id" value={t.id as string} />
                  <input name="title" defaultValue={s.title as string} className={`${input} w-52`} aria-label="Titolo sottoargomento" />
                  <input name="position" type="number" defaultValue={s.position as number} className={`${input} w-14`} aria-label="Posizione" />
                  <input name="exam_weight" type="number" step="0.1" defaultValue={Number(s.exam_weight)} className={`${input} w-14`} aria-label="Peso" />
                  <label className="flex items-center gap-1"><input type="checkbox" name="is_free" defaultChecked={s.is_free as boolean} /> Gratis</label>
                  <button className="rounded border border-slate-300 px-2 py-1">Salva</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={saveSubtopic} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3 text-sm">
            <input type="hidden" name="topic_id" value={t.id as string} />
            <input name="id" placeholder="id-sottoargomento" required className={`${input} w-44`} />
            <input name="title" placeholder="Titolo" required className={`${input} w-44`} />
            <input name="position" type="number" defaultValue={0} className={`${input} w-14`} aria-label="Posizione" />
            <input name="exam_weight" type="number" step="0.1" defaultValue={1} className={`${input} w-14`} aria-label="Peso" />
            <label className="flex items-center gap-1"><input type="checkbox" name="is_free" /> Gratis</label>
            <button className="rounded border border-slate-300 px-2 py-1">+ Sottoargomento</button>
          </form>
        </section>
      ))}

      <section className="rounded-xl border-2 border-dashed border-slate-300 p-4">
        <h2 className="font-semibold">Nuovo argomento</h2>
        <form action={saveTopic} className="mt-2 flex flex-wrap items-end gap-2 text-sm">
          <input name="id" placeholder="id-argomento" required className={`${input} w-44`} />
          <input name="title" placeholder="Titolo" required className={`${input} w-56`} />
          <input name="position" type="number" defaultValue={0} className={`${input} w-16`} aria-label="Posizione" />
          <input name="exam_weight" type="number" step="0.1" defaultValue={1} className={`${input} w-16`} aria-label="Peso" />
          <button className="rounded-lg bg-indigo-600 px-3 py-1 font-semibold text-white">Crea</button>
        </form>
      </section>
    </main>
  );
}
