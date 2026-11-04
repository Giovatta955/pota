// Supabase chiama la chiave pubblica "publishable key" (vecchio nome: anon key). Accettiamo entrambi.
// Nota: i riferimenti devono restare letterali, altrimenti Next non li inserisce nel bundle del browser.
export const publicKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = publicKey();
  if (!url || !anon) throw new Error("Mancano NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (vedi .env.example)");
  return { url, anon };
}
export const hasSupabaseEnv = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!publicKey();
