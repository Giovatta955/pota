// Uso: npm run preflight [-- --live]   Controllo pre-lancio. Exit 1 se ci sono blocchi.
// Legge l'ambiente corrente (.env.local o variabili di Vercel esportate).
import fs from "node:fs";
import path from "node:path";
import { config } from "../src/lib/config";
import { parseArgs } from "./lib/common";

const live = parseArgs().flags.live === true;
type Row = { ok: boolean; level: "BLOCCO" | "avviso"; msg: string };
const rows: Row[] = [];
const check = (ok: boolean, level: Row["level"], msg: string) => rows.push({ ok, level, msg });
const env = (k: string) => process.env[k] ?? "";

for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_SITE_URL"])
  check(!!env(k), "BLOCCO", `variabile ${k} impostata`);

check(!!(env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || env("NEXT_PUBLIC_SUPABASE_ANON_KEY")), "BLOCCO", "chiave pubblica Supabase (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) impostata");
const site = env("NEXT_PUBLIC_SITE_URL");
check(!live || site.startsWith("https://"), "BLOCCO", "NEXT_PUBLIC_SITE_URL è https:// (produzione)");
check(!site.includes("localhost") || !live, "BLOCCO", "NEXT_PUBLIC_SITE_URL non punta a localhost");

const sk = env("STRIPE_SECRET_KEY");
check(live ? sk.startsWith("sk_live_") : sk.startsWith("sk_test_") || !sk, "BLOCCO", live ? "chiave Stripe LIVE (sk_live_…)" : "chiave Stripe in modalità test");
check(!env("STRIPE_WEBHOOK_SECRET") || env("STRIPE_WEBHOOK_SECRET").startsWith("whsec_"), "BLOCCO", "STRIPE_WEBHOOK_SECRET ha formato whsec_…");
check(!env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_ROLE_KEY") !== (env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || env("NEXT_PUBLIC_SUPABASE_ANON_KEY")), "BLOCCO", "service role diversa dalla chiave anon");

const end = new Date(config.prices.passValidUntil);
check(!Number.isNaN(end.getTime()) && end > new Date(), "avviso", "config.prices.passValidUntil è una data futura (altrimenti il pass vale 12 mesi)");
check(config.prices.monthlyEur > 0 && config.prices.passEur > 0, "BLOCCO", "prezzi in config.ts valorizzati");

// segnaposto rimasti nel codice
let todos = 0;
const walk = (d: string) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(tsx?|md)$/.test(f.name)) todos += (fs.readFileSync(p, "utf8").match(/TODO_GIOVANNI/g) ?? []).length;
  }
};
walk("src");
check(todos === 0, live ? "BLOCCO" : "avviso", `segnaposto TODO_GIOVANNI rimasti in src/: ${todos} (dati fiscali, testi legali)`);

for (const r of rows) console.log(`${r.ok ? "✔" : r.level === "BLOCCO" ? "✖" : "⚠"} ${r.msg}`);
const blocks = rows.filter((r) => !r.ok && r.level === "BLOCCO").length;
console.log(blocks ? `\n${blocks} blocchi: non lanciare.` : "\nNessun blocco.");
process.exit(blocks ? 1 : 0);
