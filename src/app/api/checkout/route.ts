import { siteOrigin } from "@/lib/site-origin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";

const bodySchema = z.object({ plan: z.enum(["monthly", "pass"]), consent: z.literal("on") });

export async function POST(request: Request) {
  const origin = siteOrigin(request);
  const s = await getSession();
  if (!s) return NextResponse.redirect(`${origin}/login`, 303);
  const form = Object.fromEntries(await request.formData());
  const parsed = bodySchema.safeParse(form);
  // senza consenso esplicito all'accesso immediato non si procede (diritto di recesso)
  if (!parsed.success) return NextResponse.redirect(`${origin}/account?errore=consenso`, 303);

  const supabase = await createClient();
  await supabase.from("profiles").update({ withdrawal_consent_at: new Date().toISOString() }).eq("id", s.userId);
  const { data: existing } = await supabase.from("subscriptions").select("provider_customer_id").eq("user_id", s.userId).not("provider_customer_id", "is", null).limit(1).maybeSingle();

  const url = await getPaymentProvider().createCheckout({
    userId: s.userId, email: s.email, plan: parsed.data.plan,
    customerId: (existing?.provider_customer_id as string | null) ?? null,
    successUrl: `${origin}/account?ok=1`, cancelUrl: `${origin}/account`,
  });
  return NextResponse.redirect(url, 303);
}
