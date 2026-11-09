// Login dal link email (metodo token_hash): funziona da qualsiasi browser/dispositivo,
// a differenza del flusso PKCE che richiede lo stesso browser in cui si è chiesto il link.
import { siteOrigin } from "@/lib/site-origin";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = siteOrigin(request);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/login?errore=link`);
}
