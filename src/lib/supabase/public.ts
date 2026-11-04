import { createClient } from "@supabase/supabase-js";

/** Client anonimo senza cookie: per pagine pubbliche statiche (landing, sitemap). Restituisce null se non configurato. */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null;
}
