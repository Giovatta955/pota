# CHECKLIST — Piattaforma TFA Sostegno

Legenda: `[x]` fatto (con data) · `[ ]` da fare · `TODO_GIOVANNI` = serve un tuo input.

## Fase 0 — Setup
- [x] Struttura repo, Next.js 16 + TS strict + Tailwind 4 + ESLint + Vitest (2026-11-03)
- [x] `.env.example`, `.gitignore`, `lib/config.ts` (prezzi configurabili) (2026-11-03)
- [x] Test/lint/build verdi (2026-11-03)
- [ ] README (setup locale, env, pipeline, deploy)

## Fase 1 — Database e contenuti
- [x] Migrazioni Supabase (tabelle §3) + RLS — `supabase/migrations/0001_init.sql` (2026-11-04)
- [x] Schema zod domanda/mappa/flashcard + test (2026-11-04)
- [x] Seed di esempio — `content/seed/esempio.json` (2026-11-04)

## Fase 2 — Pipeline contenuti (pilota: 1 argomento)
- [x] ingest · generate · validate · review · import (idempotenti, --dry-run, stima costi) (2026-11-04) — `generate` non provato dal vivo: manca ANTHROPIC_API_KEY
- [ ] Collaudo pilota con un argomento reale (serve chiave + materiali)

## Fase 3 — Logica core (con test)
- [ ] SM-2 · debolezza/livelli · composizione esame · controllo accessi paywall

## Fase 4 — App
- [ ] Auth magic link (+Google)
- [ ] Viewer riassunto / mappa / flashcard
- [ ] Quiz per livello + "Segnala errore"
- [ ] Allenatore + "Le tue fragilità"
- [ ] Esame simulato + report
- [ ] Dashboard

## Fase 5 — Pagamenti
- [ ] `lib/payments` (Stripe Checkout, Portal, webhook) + paywall server-side

## Fase 6 — Pagine, SEO, compliance
- [ ] Landing, pagine argomento, sitemap/OG
- [ ] Privacy, cookie, termini, recesso, disclaimer
- [ ] Export/eliminazione dati (GDPR), admin minimo, email benvenuto

## Fase 7 — Deploy
- [ ] Vercel + env + dominio

---
## Da fare da Giovanni (non modificato da Claude)
- [ ] Account: GitHub, Supabase, Vercel, Stripe, Anthropic (API), dominio
- [ ] Chiavi in `.env.local` (vedi `.env.example`)
- [ ] Materiali sorgente in `/sources/<argomento>/`
- [ ] Parere commercialista (P.IVA, regime, Stripe vs Lemon Squeezy)
- [ ] Testi legali definitivi
