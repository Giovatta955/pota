"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { INITIAL_CARD, reviewKnown } from "@/lib/srs/sm2";
import { applyAnswer, type TopicStat } from "@/lib/trainer/stats";

const today = () => new Date().toISOString().slice(0, 10);

const gradeSchema = z.object({ cardId: z.string().min(1), known: z.boolean() });
export async function gradeCard(input: z.infer<typeof gradeSchema>) {
  const { cardId, known } = gradeSchema.parse(input);
  const s = await getSession();
  if (!s) return { ok: false as const };
  const supabase = await createClient();
  // la RLS su flashcards impedisce di valutare carte a cui non hai accesso
  const { data: card } = await supabase.from("flashcards").select("id").eq("id", cardId).maybeSingle();
  if (!card) return { ok: false as const };
  const { data: p } = await supabase.from("flashcard_progress").select("*").eq("user_id", s.userId).eq("flashcard_id", cardId).maybeSingle();
  const prev = p ? { ease: p.ease as number, intervalDays: p.interval_days as number, repetitions: p.repetitions as number, dueDate: p.due_date as string } : INITIAL_CARD(today());
  const next = reviewKnown(prev, known, today());
  await supabase.from("flashcard_progress").upsert({
    user_id: s.userId, flashcard_id: cardId, ease: next.ease, interval_days: next.intervalDays, repetitions: next.repetitions, due_date: next.dueDate,
  });
  return { ok: true as const, dueDate: next.dueDate };
}

const answerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.enum(["A", "B", "C", "D"]),
  timeMs: z.number().int().min(0).max(3_600_000).optional(),
  mode: z.enum(["quiz", "trainer"]),
});
/** Corregge sul server (la risposta giusta non viaggia al client prima di rispondere), registra il tentativo e aggiorna le statistiche. */
export async function submitAnswer(input: z.infer<typeof answerSchema>) {
  const a = answerSchema.parse(input);
  const s = await getSession();
  if (!s) return { ok: false as const, error: "login" as const };
  const supabase = await createClient();
  const { data: q } = await supabase.from("questions").select("id,topic_id,level,correct,explanation,reference").eq("id", a.questionId).maybeSingle();
  if (!q) return { ok: false as const, error: "accesso" as const };
  const correct = q.correct === a.answer;
  await supabase.from("attempts").insert({ user_id: s.userId, question_id: q.id, answer: a.answer, is_correct: correct, time_ms: a.timeMs ?? null, mode: a.mode });

  const { data: st } = await supabase.from("topic_stats").select("*").eq("user_id", s.userId).eq("topic_id", q.topic_id).maybeSingle();
  const stat: TopicStat = st
    ? { topicId: q.topic_id as string, accuracyEma: st.accuracy_ema as number, currentLevel: st.current_level as number, nAnswers: st.n_answers as number }
    : { topicId: q.topic_id as string, accuracyEma: 0.5, currentLevel: 1, nAnswers: 0 };
  const { data: recent } = await supabase
    .from("attempts")
    .select("is_correct, questions!inner(topic_id,level)")
    .eq("user_id", s.userId)
    .eq("questions.topic_id", q.topic_id)
    .eq("questions.level", stat.currentLevel)
    .order("created_at", { ascending: false })
    .limit(10);
  const outcomes = (recent ?? []).map((r) => r.is_correct as boolean).reverse();
  const next = applyAnswer(stat, correct, outcomes);
  await supabase.from("topic_stats").upsert({
    user_id: s.userId, topic_id: q.topic_id, accuracy_ema: next.accuracyEma, current_level: next.currentLevel, n_answers: next.nAnswers,
  });
  return { ok: true as const, correct, correctKey: q.correct as string, explanation: q.explanation as string, reference: (q.reference as string | null) ?? null };
}

const reportSchema = z.object({ questionId: z.string().min(1), note: z.string().trim().min(1).max(2000) });
export async function reportQuestion(input: z.infer<typeof reportSchema>) {
  const r = reportSchema.parse(input);
  const s = await getSession();
  if (!s) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ question_id: r.questionId, user_id: s.userId, note: r.note });
  return { ok: !error };
}
