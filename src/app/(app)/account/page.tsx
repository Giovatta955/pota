import { requireSession } from "@/lib/auth";
import { canUsePaidFeatures } from "@/lib/access";
import { config } from "@/lib/config";

export const metadata = { title: "Account" };

export default async function Account() {
  const s = await requireSession();
  const paid = canUsePaidFeatures(s.viewer, new Date());
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="text-sm text-slate-600">{s.email}</p>
      <p>Piano: <b>{paid ? "Premium" : "Gratuito"}</b></p>
      {!paid && (
        <p className="rounded-lg bg-indigo-50 p-4 text-sm">
          Piani: {config.prices.monthlyEur.toFixed(2)} €/mese oppure pass {config.prices.passEur} €. Il pagamento sarà attivato nella prossima fase.
        </p>
      )}
    </main>
  );
}
