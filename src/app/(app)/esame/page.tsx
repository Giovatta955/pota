import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { canUsePaidFeatures } from "@/lib/access";
import { config } from "@/lib/config";
import { startExam } from "@/app/exam-actions";

export const metadata = { title: "Esame simulato" };

export default async function ExamHome({ searchParams }: { searchParams: Promise<{ errore?: string }> }) {
  const s = await requireSession();
  const { errore } = await searchParams;
  const paid = canUsePaidFeatures(s.viewer, new Date());
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">Esame simulato</h1>
      <p className="mt-2 text-sm text-slate-600">Domande miste per tutti gli argomenti, con timer. Nessun feedback fino alla consegna.</p>
      {errore && <p role="alert" className="mt-4 text-sm text-red-700">Non ci sono ancora domande disponibili.</p>}
      {paid ? (
        <form action={startExam} className="mt-6 space-y-3">
          <label htmlFor="count" className="block text-sm font-medium">Numero di domande</label>
          <input id="count" name="count" type="number" min={config.exam.minQuestions} max={config.exam.maxQuestions} defaultValue={config.exam.minQuestions}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2" />
          <button className="block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">Inizia</button>
        </form>
      ) : (
        <div className="mt-6 rounded-lg bg-indigo-50 p-4 text-sm">L&apos;esame simulato è incluso nei piani a pagamento. <Link href="/account" className="font-semibold underline">Scegli un piano</Link></div>
      )}
    </main>
  );
}
