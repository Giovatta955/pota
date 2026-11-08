import { NextResponse } from "next/server";
import { getPaymentProvider, WebhookConfigError } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const raw = await request.text(); // serve il corpo grezzo per verificare la firma
  let update;
  try {
    update = await getPaymentProvider().parseWebhook(raw, request.headers.get("stripe-signature"));
  } catch (e) {
    // configurazione mancante → 500 (Stripe ritenta); firma sbagliata → 400
    if (e instanceof WebhookConfigError) return NextResponse.json({ error: "configurazione mancante" }, { status: 500 });
    return NextResponse.json({ error: "firma non valida" }, { status: 400 });
  }
  if (!update) return NextResponse.json({ ok: true, ignored: true });

  const db = createAdminClient();
  const { error } = await db.from("subscriptions").upsert(
    {
      user_id: update.userId,
      provider: update.provider,
      provider_customer_id: update.providerCustomerId,
      provider_subscription_id: update.providerSubscriptionId,
      plan: update.plan,
      status: update.status,
      current_period_end: update.currentPeriodEnd?.toISOString() ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider_subscription_id" }, // idempotente: Stripe può ripetere gli eventi
  );
  if (error) return NextResponse.json({ error: "db" }, { status: 500 }); // 500 → Stripe riprova
  return NextResponse.json({ ok: true });
}
