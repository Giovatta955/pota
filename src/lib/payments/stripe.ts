import Stripe from "stripe";
import { config } from "../config";
import type { PaymentProvider, Plan, SubscriptionUpdate } from "./types";

const PROVIDER = "stripe";

/** Fine accesso del pass: data del concorso da config; se ancora segnaposto, 12 mesi dall'acquisto. */
export function passEnd(now: Date, configured: string = config.prices.passValidUntil): Date {
  const d = new Date(configured);
  if (!Number.isNaN(d.getTime()) && d.getTime() > now.getTime()) return d;
  const fallback = new Date(now);
  fallback.setUTCFullYear(fallback.getUTCFullYear() + 1);
  return fallback;
}

type SubLike = {
  id: string;
  status: string;
  customer: string | { id: string } | null;
  metadata?: Record<string, string> | null;
  current_period_end?: number | null;
  items?: { data: { current_period_end?: number | null }[] };
};

/** Normalizza una Subscription Stripe (il periodo può stare sull'oggetto o sugli items, a seconda della versione API). */
export function fromSubscription(sub: SubLike): SubscriptionUpdate | null {
  const userId = sub.metadata?.user_id;
  if (!userId) return null;
  const end = sub.current_period_end ?? sub.items?.data[0]?.current_period_end ?? null;
  return {
    userId,
    provider: PROVIDER,
    plan: "monthly",
    status: sub.status,
    providerCustomerId: typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
    providerSubscriptionId: sub.id,
    currentPeriodEnd: end ? new Date(end * 1000) : null,
  };
}

type SessionLike = {
  id: string;
  payment_intent?: string | { id: string } | null;
  mode: string;
  payment_status: string;
  customer: string | { id: string } | null;
  metadata?: Record<string, string> | null;
};

/** Pass una tantum: pagamento completato → accesso fino alla data del concorso. */
export function fromPassSession(s: SessionLike, now: Date): SubscriptionUpdate | null {
  if (s.mode !== "payment" || s.payment_status !== "paid" || s.metadata?.plan !== "pass") return null;
  const userId = s.metadata?.user_id;
  if (!userId) return null;
  return {
    userId,
    provider: PROVIDER,
    plan: "pass",
    status: "active",
    providerCustomerId: typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null),
    providerSubscriptionId: passKey(s.payment_intent ?? s.id),
    currentPeriodEnd: passEnd(now),
  };
}

const passKey = (pi: string | { id: string }) => `pass_${typeof pi === "string" ? pi : pi.id}`;

type ChargeLike = {
  payment_intent?: string | { id: string } | null;
  refunded?: boolean;
  customer?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
};

/** Rimborso totale di un pass → accesso revocato (i metadata del PaymentIntent sono copiati sulla charge). */
export function fromRefundedCharge(c: ChargeLike, now: Date): SubscriptionUpdate | null {
  if (!c.refunded || c.metadata?.plan !== "pass" || !c.metadata.user_id || !c.payment_intent) return null;
  return {
    userId: c.metadata.user_id,
    provider: PROVIDER,
    plan: "pass",
    status: "refunded",
    providerCustomerId: typeof c.customer === "string" ? c.customer : (c.customer?.id ?? null),
    providerSubscriptionId: passKey(c.payment_intent),
    currentPeriodEnd: now,
  };
}

/** Chiavi di ricerca dei prezzi su Stripe (create da `npm run stripe:setup`): stesso codice in test e live, niente ID da copiare. */
export const PRICE_LOOKUP: Record<Plan, string> = { monthly: "tfa_monthly", pass: "tfa_pass" };
const priceCache = new Map<Plan, string>();

async function resolvePrice(plan: Plan): Promise<string> {
  const override = plan === "monthly" ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_PASS;
  if (override) return override;
  const hit = priceCache.get(plan);
  if (hit) return hit;
  const { data } = await client().prices.list({ lookup_keys: [PRICE_LOOKUP[plan]], active: true, limit: 1 });
  const id = data[0]?.id;
  if (!id) throw new Error(`Prezzo '${PRICE_LOOKUP[plan]}' non trovato su Stripe: lancia npm run stripe:setup`);
  priceCache.set(plan, id);
  return id;
}

function client() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY mancante");
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

export const stripeProvider: PaymentProvider = {
  name: PROVIDER,

  async createCheckout({ userId, email, plan, customerId, successUrl, cancelUrl }) {
    const price = await resolvePrice(plan);
    const metadata = { user_id: userId, plan };
    const session = await client().checkout.sessions.create({
      mode: plan === "monthly" ? "subscription" : "payment",
      line_items: [{ price, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata,
      locale: "it",
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true }, // clienti con P.IVA/CF aziendale
      ...(plan === "monthly"
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata }, invoice_creation: { enabled: true, invoice_data: { metadata } } }), // pass: fattura/ricevuta Stripe
      ...(customerId ? { customer: customerId } : email ? { customer_email: email } : {}),
      ...(plan === "pass" && !customerId ? { customer_creation: "always" as const } : {}),
    }, { idempotencyKey: `checkout_${userId}_${plan}_${Math.floor(Date.now() / 60000)}` }); // doppio click = stessa sessione
    if (!session.url) throw new Error("Stripe non ha restituito l'URL di checkout");
    return session.url;
  },

  async createPortal({ customerId, returnUrl }) {
    const s = await client().billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    return s.url;
  },

  async parseWebhook(rawBody, signature) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !signature) throw new Error("firma o secret mancanti");
    const event = client().webhooks.constructEvent(rawBody, signature, secret); // lancia se la firma non è valida
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return fromPassSession(event.data.object as unknown as SessionLike, new Date());
      case "charge.refunded":
        return fromRefundedCharge(event.data.object as unknown as ChargeLike, new Date());
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return fromSubscription(event.data.object as unknown as SubLike);
      default:
        return null;
    }
  },
};

export type { Plan };
