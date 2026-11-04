"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitExam } from "@/app/exam-actions";
import type { QuizQuestion } from "./quiz";

export function ExamRunner({ examId, questions, secondsLeft }: { examId: string; questions: QuizQuestion[]; secondsLeft: number }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D" | null>>({});
  const [left, setLeft] = useState(secondsLeft);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  const submit = () => start(async () => {
    const r = await submitExam({ examId, answers });
    if (r.ok) { setDone(true); router.refresh(); }
  });

  useEffect(() => {
    const t = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (left <= 0 && !done && !pending) submit(); }); // tempo scaduto: consegna automatica

  const q = questions[i]!;
  const mm = String(Math.max(0, Math.floor(left / 60))).padStart(2, "0");
  const ss = String(Math.max(0, left % 60)).padStart(2, "0");
  const answered = Object.values(answers).filter(Boolean).length;

  return (
    <div>
      <div className="sticky top-0 flex justify-between bg-white/90 py-2 text-sm backdrop-blur">
        <span>{i + 1} / {questions.length} · risposte {answered}</span>
        <span className={`font-mono ${left < 300 ? "text-red-700" : ""}`} aria-label="Tempo rimasto">{mm}:{ss}</span>
      </div>
      <h2 className="mt-3 text-lg font-semibold">{q.stem}</h2>
      <ul className="mt-4 space-y-2">
        {q.options.map((o) => (
          <li key={o.key}>
            <button onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.key as "A" }))} aria-pressed={answers[q.id] === o.key}
              className={`w-full rounded-lg border px-4 py-3 text-left ${answers[q.id] === o.key ? "border-indigo-600 bg-indigo-50" : "border-slate-300"}`}>
              <b className="mr-2">{o.key}</b>{o.text}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between gap-2">
        <button disabled={i === 0} onClick={() => setI(i - 1)} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">Indietro</button>
        {i < questions.length - 1
          ? <button onClick={() => setI(i + 1)} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Avanti</button>
          : <button disabled={pending} onClick={() => { if (answered === questions.length || window.confirm(`Hai lasciato ${questions.length - answered} domande senza risposta. Consegnare?`)) submit(); }}
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white">Consegna</button>}
      </div>
    </div>
  );
}
