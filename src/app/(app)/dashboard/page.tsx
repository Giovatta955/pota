import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { canUsePaidFeatures } from "@/lib/access";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const session = await requireSession();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: topics }, { count: due }, { data: stats }] = await Promise.all([
    supabase.from("topics").select("id,title").order("position"),
    supabase.from("flashcard_progress").select("flashcard_id", { count: "exact", head: true }).eq("user_id", session.userId).lte("due_date", today),
    supabase.from("topic_stats").select("topic_id,accuracy_ema,n_answers").eq("user_id", session.userId).gt("n_answers", 0).order("accuracy_ema").limit(3),
  ]);
  const paid = canUsePaidFeatures(session.viewer, new Date());
  const titleOf = new Map((topics ?? []).map((t) => [t.id as string, t.title as string]));

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <h1 className="text-2xl font-bold">Ciao{session.email ? `, ${session.email.split("@")[0]}` : ""}</h1>
      {!paid && (
        <div className="rounded-lg bg-indigo-50 p-4 text-sm">
          Stai usando la versione gratuita. <Link href="/account" className="font-semibold underline">Sblocca tutto</Link>
        </div>
      )}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-3xl font-bold">{due ?? 0}</div><div className="text-sm text-slate-600">flashcard da ripassare oggi</div></div>
        <Link href="/allenatore" className="rounded-lg border border-slate-200 p-4"><div className="text-sm text-slate-600">Punti deboli</div><div className="mt-1 font-semibold">Le tue fragilità →</div></Link>
      </section>
      {(stats ?? []).length > 0 && (
        <section>
          <h2 className="font-semibold">Da rinforzare</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {(stats ?? []).map((s) => <li key={s.topic_id as string}>{titleOf.get(s.topic_id as string) ?? s.topic_id} — {Math.round((s.accuracy_ema as number) * 100)}%</li>)}
          </ul>
        </section>
      )}
      <section>
        <h2 className="font-semibold">Argomenti</h2>
        <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
          {(topics ?? []).map((t) => (
            <li key={t.id as string}><Link href={`/argomenti/${t.id}`} className="block px-4 py-3">{t.title as string}</Link></li>
          ))}
          {!(topics ?? []).length && <li className="px-4 py-3 text-sm text-slate-500">Nessun argomento ancora importato.</li>}
        </ul>
      </section>
      <form action="/auth/signout" method="post"><button className="text-sm text-slate-500 underline">Esci</button></form>
    </main>
  );
}
