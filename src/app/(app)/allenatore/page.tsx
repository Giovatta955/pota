import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rankWeakTopics } from "@/lib/trainer/stats";

export const metadata = { title: "Le tue fragilità" };

export default async function Trainer() {
  const s = await requireSession();
  const supabase = await createClient();
  const [{ data: stats }, { data: topics }] = await Promise.all([
    supabase.from("topic_stats").select("topic_id,accuracy_ema,current_level,n_answers").eq("user_id", s.userId),
    supabase.from("topics").select("id,title"),
  ]);
  const title = new Map((topics ?? []).map((t) => [t.id as string, t.title as string]));
  const ranked = rankWeakTopics((stats ?? []).map((x) => ({ topicId: x.topic_id as string, accuracyEma: Number(x.accuracy_ema), currentLevel: x.current_level as number, nAnswers: x.n_answers as number })));
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Le tue fragilità</h1>
      <Link href="/allenatore/sessione" className="block rounded-lg bg-indigo-600 px-5 py-3 text-center font-semibold text-white">Avvia sessione allenatore</Link>
      {ranked.length === 0 ? <p className="text-sm text-slate-600">Rispondi a qualche quiz: qui vedrai gli argomenti da rinforzare.</p> : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {ranked.map((r) => (
            <li key={r.topicId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div><div className="font-medium">{title.get(r.topicId) ?? r.topicId}</div>
                <div className="text-xs text-slate-500">Precisione {Math.round(r.accuracyEma * 100)}% · livello {r.currentLevel} · {r.nAnswers} risposte</div></div>
              <Link href={`/allenatore/sessione?topic=${r.topicId}`} className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-sm">Allenati su questo</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
