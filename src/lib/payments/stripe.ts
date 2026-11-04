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
    providerSubscriptionId: `pass_${s.id}`,
    currentPeriodEnd: passEnd(now),
  };
}

function client() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY mancante");
  return new Stripe(key);
}

export const stripeProvider: PaymentProvider = {
  name: PROVIDER,

  async createCheckout({ userId, email, plan, customerId, successUrl, cancelUrl }) {
    const price = plan === "monthly" ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_PASS;
    if (!price) throw new Error(`Price ID mancante per il piano ${plan}`);
    const metadata = { user_id: userId, plan };
    const session = await client().checkout.sessions.create({
      mode: plan === "monthly" ? "subscription" : "payment",
      line_items: [{ price, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata,
      ...(plan === "monthly" ? { subscription_data: { metadata } } : {}),
      ...(customerId ? { customer: customerId } : email ? { customer_email: email } : {}),
      ...(plan === "pass" ? { customer_creation: customerId ? undefined : "always" } : {}),
    });
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
