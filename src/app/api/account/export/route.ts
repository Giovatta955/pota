import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Esportazione dati personali (GDPR art. 20): tutto ciò che la RLS ci fa leggere dell'utente. */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "login richiesto" }, { status: 401 });
  const db = await createClient();
  const own = (t: string, col = "user_id") => db.from(t).select("*").eq(col, s.userId).then((r) => r.data ?? []);
  const [profile, subscriptions, attempts, topicStats, flashcardProgress, exams, reports] = await Promise.all([
    own("profiles", "id"), own("subscriptions"), own("attempts"), own("topic_stats"), own("flashcard_progress"), own("exams"), own("reports"),
  ]);
  const examIds = exams.map((e) => e.id as string);
  const { data: examAnswers } = examIds.length ? await db.from("exam_answers").select("*").in("exam_id", examIds) : { data: [] };
  const body = JSON.stringify({ exported_at: new Date().toISOString(), email: s.email, profile, subscriptions, attempts, topic_stats: topicStats, flashcard_progress: flashcardProgress, exams, exam_answers: examAnswers, reports }, null, 2);
  return new NextResponse(body, { headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="i-miei-dati.json"' } });
}
