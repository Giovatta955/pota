import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";

export async function POST(request: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const s = await getSession();
  if (!s) return NextResponse.redirect(`${origin}/login`, 303);
  const supabase = await createClient();
  const { data } = await supabase.from("subscriptions").select("provider_customer_id").eq("user_id", s.userId).not("provider_customer_id", "is", null).limit(1).maybeSingle();
  const customerId = data?.provider_customer_id as string | undefined;
  if (!customerId) return NextResponse.redirect(`${origin}/account`, 303);
  const url = await getPaymentProvider().createPortal({ customerId, returnUrl: `${origin}/account` });
  return NextResponse.redirect(url, 303);
}
