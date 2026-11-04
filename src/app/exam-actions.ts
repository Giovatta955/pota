"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { canUsePaidFeatures } from "@/lib/access";
import { config } from "@/lib/config";
import { composeExam, gradeExam } from "@/lib/exam/compose";

const SECONDS_PER_QUESTION = 90;

export async function startExam(formData: FormData) {
  const count = z.coerce.number().int().min(config.exam.minQuestions).max(config.exam.maxQuestions).parse(formData.get("count"));
  const s = await getSession();
  if (!s) redirect("/login");
  if (!canUsePaidFeatures(s.viewer, new Date())) redirect("/account");
  const supabase = await createClient();
  const [{ data: topics }, { data: qs }] = await Promise.all([
    supabase.from("topics").select("id,exam_weight"),
    supabase.from("questions").select("id,topic_id,level").eq("status", "published").eq("active", true),
  ]);
  const { ids } = composeExam({
    count,
    topics: (topics ?? []).map((t) => ({ topicId: t.id as string, weight: Number(t.exam_weight) })),
    pool: (qs ?? []).map((q) => ({ id: q.id as string, topicId: q.topic_id as string, level: q.level as number })),
    levelMix: config.exam.levelMix,
    rng: Math.random,
  });
  if (!ids.length) redirect("/esame?errore=vuoto");
  const { data: exam } = await supabase.from("exams").insert({ user_id: s.userId, question_ids: ids, duration_s: ids.length * SECONDS_PER_QUESTION }).select("id").single();
  redirect(`/esame/${exam!.id}`);
}

const submitSchema = z.object({ examId: z.string().uuid(), answers: z.record(z.string(), z.enum(["A", "B", "C", "D"]).nullable()) });
/** Consegna: corregge sul server, salva risposte, punteggio e tentativi (modalità exam). */
export async function submitExam(input: z.infer<typeof submitSchema>) {
  const { examId, answers } = submitSchema.parse(input);
  const s = await getSession();
  if (!s) return { ok: false as const };
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("id,question_ids,submitted_at").eq("id", examId).eq("user_id", s.userId).maybeSingle();
  if (!exam || exam.submitted_at) return { ok: false as const };
  const ids = exam.question_ids as string[];
  const { data: qs } = await supabase.from("questions").select("id,topic_id,level,correct").in("id", ids);
  const graded = gradeExam((qs ?? []).map((q) => ({ id: q.id as string, topicId: q.topic_id as string, level: q.level as number, correct: q.correct as string })), answers);
  await supabase.from("exam_answers").upsert(ids.map((id) => ({ exam_id: examId, question_id: id, answer: answers[id] ?? null })));
  const given = (qs ?? []).filter((q) => answers[q.id as string]);
  if (given.length)
    await supabase.from("attempts").insert(given.map((q) => ({ user_id: s.userId, question_id: q.id, answer: answers[q.id as string], is_correct: answers[q.id as string] === q.correct, mode: "exam" })));
  await supabase.from("exams").update({ submitted_at: new Date().toISOString(), score: graded.score }).eq("id", examId);
  return { ok: true as const };
}
