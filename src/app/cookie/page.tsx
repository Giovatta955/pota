import { LegalPage } from "@/components/legal-page";
export const metadata = { title: "Cookie policy" };

export default function Cookie() {
  return (
    <LegalPage title="Cookie policy">
      <p>Il sito usa solo cookie <b>tecnici</b>, necessari per l&apos;accesso (sessione di autenticazione). Non usiamo cookie di profilazione né strumenti di analisi che installano cookie, perciò non è richiesto alcun banner di consenso.</p>
      <ul>
        <li>Cookie di sessione dell&apos;autenticazione: durata della sessione, necessari per restare connesso.</li>
        <li>Podcast e video: i lettori di terzi (YouTube in modalità privacy avanzata, Vimeo, Spotify) si caricano <b>solo dopo che premi &quot;Riproduci&quot;</b> e possono impostare cookie propri. Prima non viene contattato alcun servizio esterno.</li>
        <li>Pagamenti: durante il checkout, Stripe può impostare propri cookie tecnici sul suo dominio.</li>
      </ul>
      <p>Se in futuro verranno introdotti strumenti di analisi o cookie non tecnici, questa pagina verrà aggiornata e verrà chiesto il consenso. TODO_GIOVANNI: se scegli un&apos;analitica (es. Plausible), aggiorna qui.</p>
    </LegalPage>
  );
}
