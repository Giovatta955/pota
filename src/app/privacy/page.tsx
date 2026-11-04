import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";
export const metadata = { title: "Privacy policy" };

export default function Privacy() {
  const o = site.owner;
  return (
    <LegalPage title="Informativa sulla privacy">
      <h2>Titolare del trattamento</h2>
      <p>{o.name} — P.IVA {o.vat} — {o.address} — contatto privacy: {o.email}.</p>
      <h2>Dati che trattiamo</h2>
      <ul>
        <li>Email, per l&apos;accesso con link magico (o account Google, se scelto).</li>
        <li>Dati di studio: risposte ai quiz, esiti degli esami, progressi delle flashcard, segnalazioni inviate.</li>
        <li>Dati di abbonamento (stato, scadenza, identificativi cliente). I dati della carta sono gestiti solo dal fornitore di pagamenti e non transitano dai nostri server.</li>
      </ul>
      <h2>Finalità e basi giuridiche</h2>
      <ul>
        <li>Erogare il servizio e gestire l&apos;account (esecuzione del contratto).</li>
        <li>Fatturazione e obblighi fiscali (obbligo di legge).</li>
        <li>Sicurezza e prevenzione abusi (legittimo interesse).</li>
      </ul>
      <h2>Fornitori (responsabili del trattamento)</h2>
      <p>Supabase (database e autenticazione), Vercel (hosting), Stripe (pagamenti). TODO_GIOVANNI: verificare sedi dei server e trasferimenti extra-UE con relative garanzie.</p>
      <h2>Conservazione</h2>
      <p>Finché l&apos;account è attivo; alla cancellazione i dati personali vengono eliminati, salvo quelli da conservare per legge (fiscali). TODO_GIOVANNI: indicare i termini.</p>
      <h2>I tuoi diritti</h2>
      <p>Puoi accedere ai tuoi dati, esportarli e cancellare l&apos;account direttamente dall&apos;area Account; per gli altri diritti (rettifica, opposizione, limitazione, reclamo al Garante) scrivi a {o.email}.</p>
      <h2>Intelligenza artificiale</h2>
      <p>I contenuti sono prodotti offline e revisionati; i tuoi dati non vengono inviati a servizi di IA durante l&apos;uso del sito.</p>
    </LegalPage>
  );
}
