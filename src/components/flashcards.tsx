"use client";
import { useState, useTransition } from "react";
import { gradeCard } from "@/app/actions";

export type Card = { id: string; front: string; back: string };

export function Flashcards({ cards, canSave }: { cards: Card[]; canSave: boolean }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, start] = useTransition();
  if (!cards.length) return <p className="text-sm text-slate-500">Nessuna flashcard da ripassare.</p>;
  if (i >= cards.length) return <p role="status" className="rounded-lg bg-emerald-50 p-4">Sessione completata 🎉 ({cards.length} carte)</p>;
  const c = cards[i]!;
  const grade = (known: boolean) =>
    start(async () => {
      if (canSave) await gradeCard({ cardId: c.id, known });
      setFlipped(false);
      setI((n) => n + 1);
    });
  return (
    <div>
      <div className="mb-2 text-xs text-slate-500">{i + 1} / {cards.length}</div>
      <button onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "Mostra domanda" : "Mostra risposta"}
        className="flex min-h-48 w-full items-center justify-center rounded-xl border border-slate-300 p-6 text-center text-lg">
        {flipped ? c.back : c.front}
      </button>
      {flipped ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button disabled={pending} onClick={() => grade(false)} className="rounded-lg border border-red-300 py-3 font-semibold text-red-800">Non so</button>
          <button disabled={pending} onClick={() => grade(true)} className="rounded-lg bg-emerald-600 py-3 font-semibold text-white">So</button>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-slate-500">Tocca la carta per girarla</p>
      )}
    </div>
  );
}
