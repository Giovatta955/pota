# CHECKLIST — Piattaforma TFA Sostegno

Legenda: `[x]` fatto (con data) · `[ ]` da fare · `TODO_GIOVANNI` = serve un tuo input.

## Fase 0 — Setup
- [x] Struttura repo, Next.js 16 + TS strict + Tailwind 4 + ESLint + Vitest (2026-11-03)
- [x] `.env.example`, `.gitignore`, `lib/config.ts` (prezzi configurabili) (2026-11-03)
- [x] Test/lint/build verdi (2026-11-03)
- [x] README (setup locale, env, pipeline, pagamenti, deploy) (2026-11-04)

## Fase 1 — Database e contenuti
- [x] Migrazioni Supabase (tabelle §3) + RLS — `supabase/migrations/0001_init.sql` (2026-11-04)
- [x] Schema zod domanda/mappa/flashcard + test (2026-11-04)
- [x] Seed di esempio — `content/seed/esempio.json` (2026-11-04)

## Fase 2 — Pipeline contenuti (pilota: 1 argomento)
- [x] ingest · generate · validate · review · import (idempotenti, --dry-run, stima costi) (2026-11-04) — `generate` non provato dal vivo: manca ANTHROPIC_API_KEY
- [ ] Collaudo pilota con un argomento reale (serve chiave + materiali)

## Fase 3 — Logica core (con test)
- [x] SM-2 · debolezza/livelli · composizione esame · controllo accessi paywall — `src/lib/{srs,trainer,exam,access}` (2026-11-04)

## Fase 4 — App
- [x] Auth magic link (+Google) (2026-11-04)
- [x] Viewer riassunto / mappa / flashcard (2026-11-04)
- [x] Quiz per livello + "Segnala errore" (2026-11-04)
- [x] Allenatore + "Le tue fragilità" (2026-11-04)
- [x] Esame simulato + report (2026-11-04)
- [x] Dashboard (2026-11-04)

- [ ] Collaudo end-to-end: Supabase creato e migrazione eseguita (2026-11-04, RLS verificata); mancano secret key, seed e login reale

## Fase 5 — Pagamenti
- [x] `lib/payments` (Stripe Checkout, Portal, webhook) + paywall server-side (2026-11-04) — provato in test mode: prezzi, portale e checkout creati (2026-11-04); manca solo il test del webhook con evento reale

## Fase 6 — Pagine, SEO, compliance
- [x] Landing, pagine argomento, sitemap/OG (2026-11-04)
- [x] Privacy, cookie, termini, recesso, disclaimer — bozze con TODO_GIOVANNI (2026-11-04)
- [x] Export/eliminazione dati (GDPR) e admin minimo (2026-11-04)
- [ ] Email di benvenuto: da decidere (vedi nota in README, richiede servizio email)

## Extra richiesti
- [x] Gestione argomenti/sottoargomenti da `/admin/argomenti` (2026-11-04)
- [x] Sezione "Podcast e video" per sottoargomento + gestione da `/admin/media` — richiede `0002_media.sql` (2026-11-04)
- [x] Upload file (NotebookLM) in bucket privato con link firmati e paywall via RLS — `0003_media_storage.sql` (2026-11-04)
- [x] Eseguite `0002_media.sql` e `0003_media_storage.sql` su Supabase, RLS verificata (2026-11-04)
- [ ] Verificare termini d'uso NotebookLM (uso commerciale) e che l'input siano i riassunti originali, non fonti protette (Giovanni)

## Fase 7 — Deploy
- [x] Preparazione deploy: `DEPLOY.md`, `npm run preflight`, header di sicurezza, CI GitHub (2026-11-04)
- [ ] Deploy su Vercel + env + dominio (richiede i tuoi account)

---
## Da fare da Giovanni (non modificato da Claude)
- [ ] Account: GitHub, Supabase, Vercel, Stripe, Anthropic (API), dominio
- [ ] Chiavi in `.env.local` (vedi `.env.example`)
- [ ] Materiali sorgente in `/sources/<argomento>/`
- [ ] Parere commercialista (P.IVA, regime, Stripe vs Lemon Squeezy)
- [ ] Testi legali definitivi
