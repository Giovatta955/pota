"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitAnswer, reportQuestion } from "@/app/actions";

export type QuizQuestion = { id: string; level: number; stem: string; options: { key: string; text: string }[] };
type Feedback = { correct: boolean; correctKey: string; explanation: string; reference: string | null };

export function Quiz({ questions, mode = "quiz" }: { questions: QuizQuestion[]; mode?: "quiz" | "trainer" }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [score, setScore] = useState(0);
  const [reported, setReported] = useState(false);
  const [pending, start] = useTransition();
  const t0 = useRef(0); // istante di inizio domanda, impostato in effect/handler (mai nel render)
  useEffect(() => { t0.current = Date.now(); }, [i]);

  if (!questions.length) return <p className="text-sm text-slate-500">Nessuna domanda disponibile per questa scelta.</p>;
  if (i >= questions.length)
    return <p role="status" className="rounded-lg bg-indigo-50 p-4 text-lg">Hai risposto correttamente a <b>{score}</b> domande su {questions.length}.</p>;

  const q = questions[i]!;
  const answer = (key: string) => {
    if (fb) return;
    setPicked(key);
    start(async () => {
      const r = await submitAnswer({ questionId: q.id, answer: key as "A", timeMs: Date.now() - t0.current, mode });
      if (r.ok) {
        setFb(r);
        if (r.correct) setScore((s) => s + 1);
      } else setPicked(null);
    });
  };
  const next = () => { setI((n) => n + 1); setPicked(null); setFb(null); setReported(false); };
  const report = () => {
    const note = window.prompt("Cosa non va in questa domanda?");
    if (note?.trim()) start(async () => { const r = await reportQuestion({ questionId: q.id, note }); setReported(r.ok); });
  };

  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-slate-500"><span>Domanda {i + 1} / {questions.length}</span><span>Livello {q.level}</span></div>
      <h2 className="text-lg font-semibold">{q.stem}</h2>
      <ul className="mt-4 space-y-2">
        {q.options.map((o) => {
          const state = fb ? (o.key === fb.correctKey ? "ok" : o.key === picked ? "ko" : "") : "";
          return (
            <li key={o.key}>
              <button disabled={!!fb || pending} onClick={() => answer(o.key)}
                className={`w-full rounded-lg border px-4 py-3 text-left ${state === "ok" ? "border-emerald-600 bg-emerald-50" : state === "ko" ? "border-red-600 bg-red-50" : "border-slate-300"}`}>
                <b className="mr-2">{o.key}</b>{o.text}
              </button>
            </li>
          );
        })}
      </ul>
      {fb && (
        <div role="status" className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <p className="font-semibold">{fb.correct ? "Corretto ✔" : `Sbagliato — la risposta giusta è ${fb.correctKey}`}</p>
          <p>{fb.explanation}</p>
          {fb.reference && <p className="text-slate-500">Rif.: {fb.reference}</p>}
          <div className="flex items-center justify-between pt-2">
            <button onClick={report} disabled={reported} className="text-xs text-slate-500 underline">{reported ? "Segnalata, grazie" : "Segnala errore"}</button>
            <button onClick={next} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">{i + 1 === questions.length ? "Fine" : "Avanti"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
