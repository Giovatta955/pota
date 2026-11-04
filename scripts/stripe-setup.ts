// Uso: npm run stripe:setup            (usa STRIPE_SECRET_KEY: sk_test_… per i test, sk_live_… per la produzione)
// Idempotente: crea (o riusa) prodotti e prezzi in base a config.ts, con lookup_key fissi, e configura il Customer Portal.
import Stripe from "stripe";
import { config } from "../src/lib/config";
import { PRICE_LOOKUP } from "../src/lib/payments/stripe";
import { die, log } from "./lib/common";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) die("STRIPE_SECRET_KEY mancante (.env.local)");
const stripe = new Stripe(key);
const cents = (eur: number) => Math.round(eur * 100);

async function ensurePrice(lookup: string, name: string, eur: number, recurring: boolean) {
  const { data } = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
  const existing = data[0];
  if (existing && existing.unit_amount === cents(eur)) return log(`✔ ${lookup}: già presente (${existing.id}, ${eur} €)`);
  const created = await stripe.prices.create({
    currency: "eur",
    unit_amount: cents(eur),
    tax_behavior: "inclusive", // prezzi IVA inclusa (TODO_GIOVANNI: confermare con il commercialista)
    lookup_key: lookup,
    transfer_lookup_key: true, // se il prezzo cambia, il lookup_key passa al nuovo e il vecchio resta per chi è già abbonato
    ...(recurring ? { recurring: { interval: "month" as const } } : {}),
    product_data: { name },
  });
  log(`✔ ${lookup}: creato ${created.id} (${eur} €)${existing ? " — sostituisce il precedente" : ""}`);
}

async function ensurePortal() {
  const { data } = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
  if (data[0]) return log("✔ Customer Portal: configurazione predefinita già presente (verifica nel Dashboard)");
  await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Gestisci il tuo abbonamento" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  });
  log("✔ Customer Portal configurato");
}

async function main() {
  log(`Modalità: ${key!.startsWith("sk_live") ? "LIVE ⚠" : "test"}`);
  await ensurePrice(PRICE_LOOKUP.monthly, "Abbonamento mensile — Preparazione TFA Sostegno", config.prices.monthlyEur, true);
  await ensurePrice(PRICE_LOOKUP.pass, "Pass fino al concorso — Preparazione TFA Sostegno", config.prices.passEur, false);
  await ensurePortal();
  log("Webhook: crea l'endpoint dopo il deploy (vedi README) oppure usa `stripe listen` in locale.");
}
main().catch((e) => die(e instanceof Error ? e.message : String(e)));
