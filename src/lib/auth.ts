import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Viewer } from "./access";

export type SessionInfo = { userId: string; email: string | null; viewer: Viewer };

/** Utente corrente (o null) con admin + abbonamenti, per i controlli di accesso lato server. */
export async function getSession(): Promise<SessionInfo | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const [{ data: profile }, { data: subs }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("status,current_period_end").eq("user_id", user.id),
  ]);
  return {
    userId: user.id,
    email: user.email ?? null,
    viewer: {
      isAdmin: !!profile?.is_admin,
      subs: (subs ?? []).map((s) => ({ status: s.status as string, currentPeriodEnd: s.current_period_end ? new Date(s.current_period_end as string) : null })),
    },
  };
}

export async function requireSession(): Promise<SessionInfo> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
