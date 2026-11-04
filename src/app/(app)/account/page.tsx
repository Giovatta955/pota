import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canUsePaidFeatures } from "@/lib/access";
import { config } from "@/lib/config";

export const metadata = { title: "Account" };

const ERRORI: Record<string, string> = {
  consenso: "Devi spuntare la richiesta di accesso immediato per procedere.",
  conferma: "Per eliminare l'account scrivi ELIMINA nel campo di conferma.",
  abbonamento: "Prima di eliminare l'account annulla l'abbonamento dal pulsante \"Gestisci abbonamento\".",
  eliminazione: "Non siamo riusciti a eliminare l'account. Riprova o scrivici.",
};

export default async function Account({ searchParams }: { searchParams: Promise<{ ok?: string; errore?: string }> }) {
  const s = await requireSession();
  const { ok, errore } = await searchParams;
  const supabase = await createClient();
  const { data: customer } = await supabase.from("subscriptions").select("provider_customer_id").eq("user_id", s.userId).not("provider_customer_id", "is", null).limit(1).maybeSingle();
  const paid = canUsePaidFeatures(s.viewer, new Date());
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="text-sm text-slate-600">{s.email}</p>
      {ok && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm">Pagamento ricevuto. L&apos;accesso si attiva in pochi secondi: aggiorna la pagina.</p>}
      {errore && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{ERRORI[errore] ?? "Qualcosa non ha funzionato."}</p>}
      <p>Piano: <b>{paid ? "Premium" : "Gratuito"}</b></p>

      {!paid && (
        <form action="/api/checkout" method="post" className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="font-semibold">Scegli un piano</legend>
            <label className="flex items-center gap-3 rounded-lg border border-slate-300 p-3"><input type="radio" name="plan" value="monthly" defaultChecked /> Abbonamento mensile — {config.prices.monthlyEur.toFixed(2)} €/mese</label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-300 p-3"><input type="radio" name="plan" value="pass" /> Pass fino al concorso — {config.prices.passEur} € una tantum</label>
          </fieldset>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" required className="mt-1" />
            {/* TODO_GIOVANNI: testo definitivo da far validare (art. 59 Codice del Consumo, contenuto digitale) */}
            <span>Chiedo l&apos;accesso immediato ai contenuti digitali e riconosco che, a fornitura iniziata, perdo il diritto di recesso.</span>
          </label>
          <button className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">Procedi al pagamento</button>
        </form>
      )}

      {customer && (
        <form action="/api/portal" method="post">
          <button className="rounded-lg border border-slate-300 px-4 py-2">Gestisci abbonamento e fatture</button>
        </form>
      )}
      <section className="space-y-3 border-t border-slate-200 pt-6">
        <h2 className="font-semibold">I tuoi dati</h2>
        <a href="/api/account/export" className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm">Scarica i miei dati (JSON)</a>
        <form action="/api/account/delete" method="post" className="space-y-2">
          <label htmlFor="conferma" className="block text-sm text-slate-600">Elimina definitivamente l&apos;account e i dati: scrivi <b>ELIMINA</b> per confermare.</label>
          <input id="conferma" name="conferma" autoComplete="off" className="rounded-lg border border-slate-300 px-3 py-2" />
          <button className="ml-2 rounded-lg border border-red-400 px-4 py-2 text-sm text-red-800">Elimina account</button>
        </form>
      </section>
      {s.viewer.isAdmin && <a href="/admin" className="block text-sm underline">Area admin</a>}
    </main>
  );
}
