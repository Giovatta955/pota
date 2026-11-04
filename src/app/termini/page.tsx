import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";
export const metadata = { title: "Termini di servizio" };

export default function Termini() {
  return (
    <LegalPage title="Termini di servizio">
      <h2>Servizio</h2>
      <p>{site.name} offre materiali di studio digitali (riassunti, mappe, flashcard, quiz, simulazioni) per la preparazione a TFA e concorsi della scuola. Il servizio ha finalità di studio e non garantisce l&apos;esito di alcuna prova.</p>
      <h2>Contenuti</h2>
      <p>I contenuti sono originali o rielaborati e non ufficiali. Non sono ceduti in licenza oltre l&apos;uso personale: è vietato copiarli, rivenderli o ridistribuirli. Potrebbero contenere errori: puoi segnalarli con il pulsante &quot;Segnala errore&quot;. Verifica sempre le norme sulle fonti ufficiali.</p>
      <h2>Account e pagamenti</h2>
      <p>L&apos;accesso avviene via email. L&apos;abbonamento mensile si rinnova automaticamente fino a disdetta, gestibile dall&apos;area Account. Il pass è un pagamento unico con accesso fino alla data indicata al momento dell&apos;acquisto. Prezzi indicati IVA inclusa. TODO_GIOVANNI: confermare.</p>
      <h2>Recesso</h2>
      <p>Vedi la pagina <a className="underline" href="/recesso">Diritto di recesso</a>.</p>
      <h2>Responsabilità</h2>
      <p>Il servizio è fornito &quot;così com&apos;è&quot;, nei limiti consentiti dalla legge. TODO_GIOVANNI: limitazioni di responsabilità, foro competente e legge applicabile.</p>
      <h2>Contatti</h2>
      <p>{site.owner.email}</p>
    </LegalPage>
  );
}
