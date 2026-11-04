# Piattaforma TFA Sostegno

Next.js + Supabase + Stripe. Zero AI a runtime: contenuti generati offline.

## Setup locale
```bash
npm install
cp .env.example .env.local   # compila i valori
npm run dev
```
Controlli: `npm run check` (lint + typecheck + test + build).

Il resto (pipeline, deploy) verrà documentato nelle fasi successive.

## Pipeline contenuti (offline, zero AI a runtime)
1. Metti i tuoi materiali in `sources/<argomento>/` (`.md`, `.txt`, `.pdf`; con intestazioni `# Titolo` per dividere i sottoargomenti). La cartella è git-ignored.
2. `npm run ingest -- <argomento> [--title="..."] [--weight=1] [--free]` → blocchi per sottoargomento.
3. `npm run generate -- <argomento> --dry-run` → stima costi (nessuna chiamata). Poi `--yes` per generare. Riprendibile: salta i sottoargomenti già fatti (`--force` per rifare, `--only=<id>`, `--per-level=4`).
4. `npm run validate -- <argomento>` → schema, duplicati, copia dalla fonte, distribuzione lettere, livelli.
5. `npm run review -- <argomento> [--level=4,5] [--sample=20]` → p=pubblica, r=rivista, d=scarta.
6. `npm run import -- <argomento> [--dry-run]` → carica su Supabase solo le domande `published` (serve `SUPABASE_SERVICE_ROLE_KEY`).

Modello via `CLAUDE_MODEL` (default `claude-sonnet-5-5`). Output in `content/generated/` (git-ignored).

## Pagamenti (Stripe)
1. In Stripe crea due prezzi: **mensile ricorrente** e **pass una tantum**; metti gli ID in `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_PASS`. Gli importi mostrati sul sito sono in `src/lib/config.ts` e devono coincidere con quelli di Stripe.
2. Attiva il **Customer Portal** (Impostazioni → Billing → Customer portal).
3. Webhook: endpoint `https://<dominio>/api/webhooks/stripe` con eventi `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created|updated|deleted`; copia il segreto in `STRIPE_WEBHOOK_SECRET`.
4. In locale: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
5. Il pass dura fino a `config.prices.passValidUntil` (data del concorso, ISO `YYYY-MM-DD`); finché è segnaposto vale 12 mesi dall'acquisto.
Per cambiare provider: implementa `PaymentProvider` (`src/lib/payments/types.ts`) e seleziona con `PAYMENT_PROVIDER`.
