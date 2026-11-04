// Regole di accesso (paywall). Specchio di public.has_paid_access / can_read_subtopic in SQL:
// il database resta l'autorità (RLS); queste funzioni servono a middleware e UI lato server.
export type SubscriptionRow = { status: string; currentPeriodEnd: Date | null };

export const ACTIVE_STATUSES = ["active", "trialing"] as const;

export function hasPaidAccess(subs: SubscriptionRow[], now: Date): boolean {
  return subs.some(
    (s) => (ACTIVE_STATUSES as readonly string[]).includes(s.status) && (s.currentPeriodEnd === null || s.currentPeriodEnd.getTime() > now.getTime()),
  );
}

export type Viewer = { isAdmin: boolean; subs: SubscriptionRow[] };

export function canReadSubtopic(subtopic: { isFree: boolean }, viewer: Viewer | null, now: Date): boolean {
  if (subtopic.isFree) return true;
  if (!viewer) return false;
  return viewer.isAdmin || hasPaidAccess(viewer.subs, now);
}

/** Esame simulato e allenatore globale: solo a pagamento (o admin). */
export function canUsePaidFeatures(viewer: Viewer | null, now: Date): boolean {
  return !!viewer && (viewer.isAdmin || hasPaidAccess(viewer.subs, now));
}
