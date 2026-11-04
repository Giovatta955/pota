// Interfaccia indipendente dal provider: per passare a Lemon Squeezy basta un nuovo file che la implementi.
export type Plan = "monthly" | "pass";

export type SubscriptionUpdate = {
  userId: string;
  provider: string;
  plan: Plan;
  status: string; // active | trialing | past_due | canceled | ...
  providerCustomerId: string | null;
  providerSubscriptionId: string; // chiave di idempotenza
  currentPeriodEnd: Date | null;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckout(args: { userId: string; email: string | null; plan: Plan; customerId: string | null; successUrl: string; cancelUrl: string }): Promise<string>;
  createPortal(args: { customerId: string; returnUrl: string }): Promise<string>;
  /** Verifica la firma e restituisce l'aggiornamento da salvare (o null se l'evento non interessa). */
  parseWebhook(rawBody: string, signature: string | null): Promise<SubscriptionUpdate | null>;
}
