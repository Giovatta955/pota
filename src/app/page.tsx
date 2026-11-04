import Link from "next/link";
import { config } from "@/lib/config";
import { site } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

const FEATURES = [
  ["Riassunti chiari", "Ogni argomento in pochi minuti, con i punti chiave."],
  ["Mappe a cascata", "Schemi espandibili per vedere i collegamenti."],
  ["Flashcard intelligenti", "Ripetizione spaziata: ripassi quando serve."],
  ["Quiz a 5 livelli", "Dalle definizioni ai casi normativi più insidiosi."],
  ["Allenatore", "Trova le tue fragilità e ti propone il ripasso mirato."],
  ["Esame simulato", "30–50 domande con timer e report finale."],
] as const;

const FAQ = [
  ["I contenuti sono ufficiali?", "No. Sono materiali originali, rielaborati con parole nostre. Il sito non è affiliato a MUR, INDIRE o università."],
  ["Cosa è gratis?", "Un argomento completo: riassunto, mappa, flashcard e quiz. Il resto richiede un piano."],
  ["Posso disdire quando voglio?", "Sì, l'abbonamento si gestisce da solo dall'area account (portale clienti), senza scrivere a nessuno."],
  ["Che differenza c'è tra mensile e pass?", "Il mensile si rinnova ogni mese; il pass si paga una volta e vale fino alla data del concorso."],
  ["Posso studiare dal telefono?", "Sì, il sito è pensato prima di tutto per lo smartphone."],
] as const;

export default async function Home() {
  const db = createPublicClient();
  const { data: topics } = db ? await db.from("topics").select("id,title").order("position") : { data: [] };
  return (
    <main className="mx-auto max-w-3xl px-4">
      <section className="py-14 text-center">
        <h1 className="text-4xl font-bold leading-tight">Prepara il TFA sostegno, <span className="text-indigo-600">un quiz alla volta</span></h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">{site.description}</p>
        <Link href="/login" className="mt-8 inline-block rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white">Inizia gratis</Link>
        <p className="mt-2 text-xs text-slate-500">Un argomento completo gratuito, senza carta.</p>
      </section>

      <section aria-labelledby="funz" className="py-8">
        <h2 id="funz" className="text-2xl font-bold">Tutto quello che serve</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(([t, d]) => <li key={t} className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></li>)}
        </ul>
      </section>

      {(topics ?? []).length > 0 && (
        <section className="py-8">
          <h2 className="text-2xl font-bold">Argomenti</h2>
          <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {(topics ?? []).map((t) => <li key={t.id as string}><Link href={`/argomenti/${t.id}`} className="block px-4 py-3">{t.title as string}</Link></li>)}
          </ul>
        </section>
      )}

      <section aria-labelledby="prezzi" className="py-8">
        <h2 id="prezzi" className="text-2xl font-bold">Prezzi</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-5"><h3 className="font-semibold">Mensile</h3><p className="mt-2 text-3xl font-bold">{config.prices.monthlyEur.toFixed(2).replace(".", ",")} €<span className="text-sm font-normal text-slate-500"> /mese</span></p><p className="mt-2 text-sm text-slate-600">Tutti gli argomenti, annulli quando vuoi.</p></div>
          <div className="rounded-xl border-2 border-indigo-600 p-5"><h3 className="font-semibold">Pass fino al concorso</h3><p className="mt-2 text-3xl font-bold">{config.prices.passEur} €<span className="text-sm font-normal text-slate-500"> una tantum</span></p><p className="mt-2 text-sm text-slate-600">Accesso completo fino alla data della prova.</p></div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Prezzi IVA inclusa. TODO_GIOVANNI: verificare con il commercialista.</p>
      </section>

      <section aria-labelledby="faq" className="py-8">
        <h2 id="faq" className="text-2xl font-bold">Domande frequenti</h2>
        <div className="mt-4 space-y-2">
          {FAQ.map(([q, a]) => <details key={q} className="rounded-lg border border-slate-200 p-4"><summary className="cursor-pointer font-medium">{q}</summary><p className="mt-2 text-sm text-slate-600">{a}</p></details>)}
        </div>
      </section>
    </main>
  );
}
