import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveQuestion, setReportStatus } from "@/app/admin-actions";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function Admin() {
  const s = await requireSession();
  if (!s.viewer.isAdmin) notFound();
  const db = await createClient();
  const { data: reports } = await db.from("reports").select("id,note,created_at,question_id").eq("status", "open").order("created_at");
  const ids = [...new Set((reports ?? []).map((r) => r.question_id as string))];
  const { data: qs } = ids.length ? await db.from("questions").select("id,level,stem,options,correct,explanation,active").in("id", ids) : { data: [] };
  const byId = new Map((qs ?? []).map((q) => [q.id as string, q]));

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Segnalazioni aperte ({(reports ?? []).length})</h1>
      {(reports ?? []).map((r) => {
        const q = byId.get(r.question_id as string);
        return (
          <section key={r.id as string} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <p className="text-sm"><b>Nota utente:</b> {r.note as string}</p>
            {q ? (
              <form action={saveQuestion} className="space-y-2">
                <input type="hidden" name="id" value={q.id as string} />
                <p className="text-xs text-slate-500">{q.id as string} · L{q.level as number} · corretta: {q.correct as string}</p>
                <textarea name="stem" defaultValue={q.stem as string} rows={3} className="w-full rounded border border-slate-300 p-2 text-sm" />
                <ul className="text-sm">{(q.options as { key: string; text: string }[]).map((o) => <li key={o.key}>{o.key === q.correct ? "✔" : "•"} {o.key}) {o.text}</li>)}</ul>
                <textarea name="explanation" defaultValue={q.explanation as string} rows={3} className="w-full rounded border border-slate-300 p-2 text-sm" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={q.active as boolean} /> Attiva (visibile agli utenti)</label>
                <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Salva domanda</button>
              </form>
            ) : <p className="text-sm text-slate-500">Domanda non trovata.</p>}
            <form action={setReportStatus} className="flex gap-2">
              <input type="hidden" name="id" value={r.id as string} />
              <button name="status" value="resolved" className="rounded-lg border border-emerald-600 px-3 py-2 text-sm">Risolta</button>
              <button name="status" value="dismissed" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Scarta</button>
            </form>
          </section>
        );
      })}
      {!(reports ?? []).length && <p className="text-sm text-slate-500">Nessuna segnalazione aperta.</p>}
    </main>
  );
}
