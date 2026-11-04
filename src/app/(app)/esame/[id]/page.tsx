import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gradeExam } from "@/lib/exam/compose";
import { ExamRunner } from "@/components/exam-runner";

export const metadata = { title: "Esame simulato" };

function secondsLeft(startedAt: string, duration: number) {
  return Math.max(0, duration - Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("*").eq("id", id).eq("user_id", s.userId).maybeSingle();
  if (!exam) notFound();
  const ids = exam.question_ids as string[];

  if (!exam.submitted_at) {
    const { data: qs } = await supabase.from("questions").select("id,level,stem,options").in("id", ids);
    const byId = new Map((qs ?? []).map((q) => [q.id as string, q]));
    const ordered = ids.map((i) => byId.get(i)).filter((q) => !!q).map((q) => ({ id: q!.id as string, level: q!.level as number, stem: q!.stem as string, options: q!.options as { key: string; text: string }[] }));
    return <main className="mx-auto max-w-3xl px-4 py-4"><ExamRunner examId={id} questions={ordered} secondsLeft={secondsLeft(exam.started_at as string, exam.duration_s as number)} /></main>;
  }

  // Report finale
  const [{ data: qs }, { data: ans }, { data: topics }] = await Promise.all([
    supabase.from("questions").select("id,topic_id,level,correct").in("id", ids),
    supabase.from("exam_answers").select("question_id,answer").eq("exam_id", id),
    supabase.from("topics").select("id,title"),
  ]);
  const answers = Object.fromEntries((ans ?? []).map((a) => [a.question_id as string, a.answer as string | null]));
  const g = gradeExam((qs ?? []).map((q) => ({ id: q.id as string, topicId: q.topic_id as string, level: q.level as number, correct: q.correct as string })), answers);
  const title = new Map((topics ?? []).map((t) => [t.id as string, t.title as string]));
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Risultato</h1>
      <div className="rounded-xl bg-indigo-50 p-6 text-center">
        <div className="text-5xl font-bold">{Math.round(g.score * 100)}%</div>
        <div className="mt-1 text-sm text-slate-600">{g.right} corrette · {g.wrong} errate · {g.blank} senza risposta su {g.total}</div>
      </div>
      <section>
        <h2 className="font-semibold">Dove ripassare</h2>
        {g.weakTopics.length === 0 ? <p className="mt-2 text-sm">Nessun errore. Ottimo!</p> : (
          <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {g.weakTopics.map((t) => (
              <li key={t.topicId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>{title.get(t.topicId) ?? t.topicId} — {t.wrong}/{t.total} errate</span>
                <span className="flex gap-3"><Link className="underline" href={`/argomenti/${t.topicId}`}>Ripassa</Link><Link className="underline" href={`/allenatore/sessione?topic=${t.topicId}`}>Allenati</Link></span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link href="/esame" className="inline-block rounded-lg border border-slate-300 px-4 py-2">Nuovo esame</Link>
    </main>
  );
}
