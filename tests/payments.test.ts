import { describe, it, expect } from "vitest";
import { fromSubscription, fromPassSession, fromRefundedCharge, passEnd } from "@/lib/payments/stripe";
import { getPaymentProvider } from "@/lib/payments";

const now = new Date("2026-11-04T12:00:00Z");

describe("payments / stripe", () => {
  it("abbonamento: legge il periodo dagli items o dall'oggetto", () => {
    const a = fromSubscription({ id: "sub_1", status: "active", customer: "cus_1", metadata: { user_id: "u1" }, items: { data: [{ current_period_end: 1796000000 }] } });
    expect(a).toMatchObject({ userId: "u1", plan: "monthly", status: "active", providerCustomerId: "cus_1", providerSubscriptionId: "sub_1" });
    expect(a!.currentPeriodEnd!.getTime()).toBe(1796000000 * 1000);
    const b = fromSubscription({ id: "sub_2", status: "past_due", customer: { id: "cus_2" }, metadata: { user_id: "u2" }, current_period_end: 1796000001 });
    expect(b!.providerCustomerId).toBe("cus_2");
    expect(b!.status).toBe("past_due");
  });
  it("abbonamento senza user_id nei metadata: ignorato", () => {
    expect(fromSubscription({ id: "s", status: "active", customer: "c", metadata: {} })).toBeNull();
  });
  it("pass pagato → accesso attivo con id idempotente", () => {
    const u = fromPassSession({ id: "cs_1", payment_intent: "pi_1", mode: "payment", payment_status: "paid", customer: "cus_1", metadata: { user_id: "u1", plan: "pass" } }, now);
    expect(u).toMatchObject({ plan: "pass", status: "active", providerSubscriptionId: "pass_pi_1" });
    expect(u!.currentPeriodEnd!.getTime()).toBeGreaterThan(now.getTime());
  });
  it("pass non pagato o sessione di abbonamento: ignorati", () => {
    expect(fromPassSession({ id: "cs", mode: "payment", payment_status: "unpaid", customer: null, metadata: { user_id: "u", plan: "pass" } }, now)).toBeNull();
    expect(fromPassSession({ id: "cs", mode: "subscription", payment_status: "paid", customer: null, metadata: { user_id: "u", plan: "monthly" } }, now)).toBeNull();
  });
  it("passEnd: usa la data del concorso se futura, altrimenti +12 mesi", () => {
    expect(passEnd(now, "2027-06-30").toISOString().slice(0, 10)).toBe("2027-06-30");
    expect(passEnd(now, "TODO_GIOVANNI").toISOString().slice(0, 10)).toBe("2027-11-04");
    expect(passEnd(now, "2020-01-01").toISOString().slice(0, 10)).toBe("2027-11-04");
  });
  it("provider sconosciuto → errore", () => {
    process.env.PAYMENT_PROVIDER = "boh";
    expect(() => getPaymentProvider()).toThrow();
    delete process.env.PAYMENT_PROVIDER;
    expect(getPaymentProvider().name).toBe("stripe");
  });
});

import Stripe from "stripe";
import { stripeProvider } from "@/lib/payments/stripe";

describe("webhook firmato", () => {
  const secret = "whsec_test";
  const payload = JSON.stringify({
    id: "evt_1", object: "event", type: "customer.subscription.updated",
    data: { object: { id: "sub_9", status: "active", customer: "cus_9", metadata: { user_id: "u9" }, current_period_end: 1796000000 } },
  });
  it("accetta firma valida e rifiuta quella sbagliata", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_x";
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    const sig = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(await stripeProvider.parseWebhook(payload, sig)).toMatchObject({ userId: "u9", providerSubscriptionId: "sub_9", status: "active" });
    await expect(stripeProvider.parseWebhook(payload, sig.replace(/v1=\w+/, "v1=deadbeef"))).rejects.toThrow();
    await expect(stripeProvider.parseWebhook(payload, null)).rejects.toThrow();
  });
});

describe("rimborsi", () => {
  it("rimborso totale di un pass revoca l'accesso con la stessa chiave del pagamento", () => {
    const u = fromRefundedCharge({ payment_intent: "pi_1", refunded: true, customer: "cus_1", metadata: { user_id: "u1", plan: "pass" } }, now);
    expect(u).toMatchObject({ providerSubscriptionId: "pass_pi_1", status: "refunded", userId: "u1" });
    expect(u!.currentPeriodEnd!.getTime()).toBe(now.getTime());
  });
  it("rimborso parziale o non-pass: ignorato", () => {
    expect(fromRefundedCharge({ payment_intent: "pi", refunded: false, metadata: { user_id: "u", plan: "pass" } }, now)).toBeNull();
    expect(fromRefundedCharge({ payment_intent: "pi", refunded: true, metadata: { user_id: "u", plan: "monthly" } }, now)).toBeNull();
  });
});
