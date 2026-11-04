import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { composeTrainerSession, type TopicStat } from "@/lib/trainer/stats";
import { Quiz } from "@/components/quiz";

export const metadata = { title: "Sessione allenatore" };
const SIZE = 10;

export default async function TrainerSession({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const s = await requireSession();
  const supabase = await createClient();
  let poolQ = supabase.from("questions").select("id,topic_id,level").eq("status", "published").eq("active", true);
  if (topic) poolQ = poolQ.eq("topic_id", topic);
  const [{ data: pool }, { data: stats }, { data: att }] = await Promise.all([
    poolQ,
    supabase.from("topic_stats").select("topic_id,accuracy_ema,current_level,n_answers").eq("user_id", s.userId),
    supabase.from("attempts").select("question_id,is_correct,created_at").eq("user_id", s.userId).order("created_at", { ascending: false }).limit(2000),
  ]);
  const seenIds = new Set((att ?? []).map((a) => a.question_id as string));
  // sbagliata = ultimo tentativo errato
  const last = new Map<string, boolean>();
  for (const a of att ?? []) if (!last.has(a.question_id as string)) last.set(a.question_id as string, a.is_correct as boolean);
  const wrongIds = new Set([...last].filter(([, ok]) => !ok).map(([id]) => id));

  const st: TopicStat[] = (stats ?? []).filter((x) => !topic || x.topic_id === topic).map((x) => ({ topicId: x.topic_id as string, accuracyEma: Number(x.accuracy_ema), currentLevel: x.current_level as number, nAnswers: x.n_answers as number }));
  const ids = composeTrainerSession({
    size: SIZE, stats: st,
    pool: (pool ?? []).map((q) => ({ id: q.id as string, topicId: q.topic_id as string, level: q.level as number })),
    seenIds, wrongIds, rng: Math.random,
  });
  const { data: qs } = ids.length ? await supabase.from("questions").select("id,level,stem,options").in("id", ids) : { data: [] };
  const byId = new Map((qs ?? []).map((q) => [q.id as string, q]));
  const questions = ids.map((i) => byId.get(i)).filter((q) => !!q).map((q) => ({ id: q!.id as string, level: q!.level as number, stem: q!.stem as string, options: q!.options as { key: string; text: string }[] }));
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Sessione allenatore</h1>
      <Quiz questions={questions} mode="trainer" />
    </main>
  );
}
