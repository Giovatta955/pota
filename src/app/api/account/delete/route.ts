import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Cancellazione account (GDPR art. 17). Le tabelle personali hanno ON DELETE CASCADE su auth.users. */
export async function POST(request: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const s = await getSession();
  if (!s) return NextResponse.redirect(`${origin}/login`, 303);
  const form = await request.formData();
  if (form.get("conferma") !== "ELIMINA") return NextResponse.redirect(`${origin}/account?errore=conferma`, 303);

  // Un abbonamento ricorrente attivo va annullato prima, altrimenti continuerebbe ad addebitare.
  const supabase = await createClient();
  const { data: subs } = await supabase.from("subscriptions").select("status,plan").eq("user_id", s.userId);
  if ((subs ?? []).some((x) => x.plan === "monthly" && ["active", "trialing", "past_due"].includes(x.status as string)))
    return NextResponse.redirect(`${origin}/account?errore=abbonamento`, 303);

  const { error } = await createAdminClient().auth.admin.deleteUser(s.userId);
  if (error) return NextResponse.redirect(`${origin}/account?errore=eliminazione`, 303);
  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/?account=eliminato`, 303);
}
