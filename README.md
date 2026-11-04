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
1. Metti `STRIPE_SECRET_KEY` (sk_test_… in test) in `.env.local`, poi `npm run stripe:setup`: crea i prezzi (mensile ricorrente + pass una tantum, importi da `src/lib/config.ts`, ritrovati via `lookup_key`) e il Customer Portal. Idempotente; ripeti con la chiave live al lancio.
2. Webhook: endpoint `https://<dominio>/api/webhooks/stripe` con eventi `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created|updated|deleted`, `charge.refunded`; il segreto va in `STRIPE_WEBHOOK_SECRET`. In locale: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
3. Il pass dura fino a `config.prices.passValidUntil` (data del concorso, `YYYY-MM-DD`); finché è segnaposto vale 12 mesi dall'acquisto. Un rimborso totale del pass revoca l'accesso.
4. Fatture: Stripe emette ricevute/fatture ma **non** la fattura elettronica SdI: TODO_GIOVANNI, chiedere al commercialista. Anche l'IVA (Stripe Tax o gestione manuale) va decisa con lui.
5. **Managed Payments** (Stripe come venditore) è attivo sul tuo account: ogni prodotto ha un tax code (`config.stripe.productTaxCode`, impostato da `stripe:setup`). TODO_GIOVANNI: decidere col commercialista chi risulta venditore (impatta fatture, IVA, commissioni e i testi legali: oggi dicono "titolare").
6. In questo ambiente cloud gli script Stripe richiedono `NODE_USE_ENV_PROXY=1` (proxy di rete); in locale/Vercel non serve.
7. Stripe Identity non è usato: per un servizio di quiz non serve e aggiungerebbe costi per verifica e oneri privacy.
Per cambiare provider: implementa `PaymentProvider` (`src/lib/payments/types.ts`) e seleziona con `PAYMENT_PROVIDER`.

## Legale, admin, GDPR
- Dati del titolare e segnaposto: `src/lib/site.ts` (cerca `TODO_GIOVANNI` in tutto il repo prima del lancio: `grep -rn TODO_GIOVANNI src`).
- Pagine legali (`/privacy`, `/cookie`, `/termini`, `/recesso`, `/disclaimer`) sono **bozze da far validare**. Solo cookie tecnici → nessun banner.
- Diventare admin: in Supabase SQL editor `update profiles set is_admin = true where email = 'tua@email';` poi vai su `/admin`.
- Area admin (`/admin`): segnalazioni, **Argomenti** (crea/modifica argomenti e sottoargomenti, ordine, peso nell'esame, gratis/premium) e **Podcast e video** (link YouTube/Vimeo/Spotify o file .mp3/.mp4 su Supabase Storage). Solo gli utenti con `is_admin = true` possono scrivere: tutti gli altri sono bloccati dalla RLS.
- Account → "Scarica i miei dati" (JSON) e "Elimina account" (blocca se c'è un abbonamento mensile attivo).
- Email di benvenuto: l'email del magic link (Supabase → Auth → Email templates) fa da benvenuto, gratis. Un'email dedicata richiede un servizio (es. Resend, piano gratuito) — da decidere.
