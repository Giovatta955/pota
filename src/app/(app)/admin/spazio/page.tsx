import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin · Spazio", robots: { index: false } };

// Limiti del piano gratuito Supabase (verifica su supabase.com/pricing se cambiano)
const LIMITS = { db: 500 * 1024 ** 2, storage: 1024 ** 3 };
type Usage = { db_bytes: number; storage_bytes: number; users: number; attempts: number; questions: number; media_files: number };
const mb = (b: number) => `${(b / 1024 ** 2).toFixed(0)} MB`;

function Bar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 80 ? "bg-red-600" : pct >= 60 ? "bg-amber-500" : "bg-emerald-600";
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span>{mb(used)} / {mb(limit)} ({pct}%)</span></div>
      <div className="mt-1 h-3 rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function Spazio() {
  const db = await createClient();
  const { data, error } = await db.rpc("usage_stats");
  if (error || !data) return <main className="mx-auto max-w-3xl px-4 py-6 text-sm text-red-700">Non riesco a leggere i consumi: hai eseguito la migrazione 0004_free_tier.sql?</main>;
  const u = data as Usage;
  const worst = Math.max(u.db_bytes / LIMITS.db, u.storage_bytes / LIMITS.storage);
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Spazio usato (piano gratuito)</h1>
      <Bar label="Database" used={u.db_bytes} limit={LIMITS.db} />
      <Bar label="File (podcast e video)" used={u.storage_bytes} limit={LIMITS.storage} />
      <p className="text-sm text-slate-600">{u.users} utenti · {u.questions} domande · {u.attempts} risposte registrate · {u.media_files} file</p>
      <p className={`rounded-lg p-3 text-sm ${worst >= 0.8 ? "bg-red-50 text-red-900" : "bg-slate-50"}`}>
        {worst >= 0.8 ? "Sei oltre l'80%: è il momento di valutare il piano Pro o di comprimere/spostare i file." : "Tutto ok. Lo storico delle risposte si pulisce da solo ogni domenica (ultimi 12 mesi, max 3000 per utente)."}
      </p>
      <p className="text-xs text-slate-500">Il traffico mensile (5 GB gratis, soprattutto ascolti dei podcast) si vede nel pannello Supabase → Usage.</p>
    </main>
  );
}
