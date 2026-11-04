import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";
export const metadata = { title: "Disclaimer" };

export default function Disclaimer() {
  return (
    <LegalPage title="Disclaimer e non affiliazione">
      <p>{site.name} è un servizio indipendente. <b>Non è affiliato, sponsorizzato né approvato</b> dal Ministero dell&apos;Università e della Ricerca (MUR), dall&apos;INDIRE o da alcuna università.</p>
      <p>Tutti i contenuti sono elaborati in modo originale a partire da fonti di studio; non riproducono materiali protetti da diritto d&apos;autore. Eventuali prove ufficiali già pubbliche sono usate solo con indicazione della fonte.</p>
      <p>I nomi citati appartengono ai rispettivi titolari e sono usati solo a scopo descrittivo.</p>
    </LegalPage>
  );
}
