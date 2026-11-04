import { stripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

/** Unico punto in cui si sceglie il provider (PAYMENT_PROVIDER=stripe di default). */
export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "stripe";
  if (name === "stripe") return stripeProvider;
  throw new Error(`Provider di pagamento sconosciuto: ${name}`);
}
export type { Plan, PaymentProvider, SubscriptionUpdate } from "./types";
