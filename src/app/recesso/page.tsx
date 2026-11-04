import { LegalPage } from "@/components/legal-page";
export const metadata = { title: "Diritto di recesso" };

export default function Recesso() {
  return (
    <LegalPage title="Diritto di recesso per contenuti digitali">
      <p>Se acquisti come consumatore, hai in generale 14 giorni per recedere da un contratto a distanza. Per i <b>contenuti digitali forniti su supporto non materiale</b>, il diritto di recesso non si applica se l&apos;esecuzione è iniziata con il tuo consenso preventivo ed esplicito e con la tua accettazione di perdere il diritto di recesso.</p>
      <p>Per questo, prima del pagamento ti chiediamo di confermare di voler accedere subito ai contenuti e di riconoscere che, a fornitura iniziata, perdi il diritto di recesso. Registriamo la data di questo consenso.</p>
      <p>Per l&apos;abbonamento mensile puoi comunque disdire in qualsiasi momento dall&apos;area Account: la disdetta ha effetto dal rinnovo successivo.</p>
      <p>TODO_GIOVANNI: far validare questo testo e inserire eventuali procedure di rimborso discrezionale.</p>
    </LegalPage>
  );
}
