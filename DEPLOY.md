# Deploy (Vercel + Supabase + Stripe)

Tempo stimato: ~1 ora. Costi: Supabase e Vercel gratuiti per iniziare; dominio ~10–15 €/anno; Stripe a commissione.

## 1. Supabase
1. Crea un progetto (regione UE). Annota **Project URL**, **publishable key** (ex anon), **secret key** (ex service role) (Settings → API).
2. SQL editor → incolla ed esegui, in ordine, `supabase/migrations/0001_init.sql` poi `0002_media.sql` e `0003_media_storage.sql` (podcast e video, bucket privato).
3. Authentication → URL Configuration: *Site URL* = `https://<dominio>`; *Redirect URLs* aggiungi `https://<dominio>/auth/callback` e `http://localhost:3000/auth/callback`.
4. Authentication → Providers: Email (magic link) attivo; Google se vuoi (client ID/secret da Google Cloud Console; redirect = URL di callback indicato da Supabase).
5. Authentication → Email templates: personalizza il "Magic Link" in italiano (fa da email di benvenuto).
6. (Consigliato) Authentication → SMTP: per volumi reali configura un SMTP tuo (il predefinito Supabase ha limiti bassi).

## 2. Contenuti
```bash
cp .env.example .env.local   # compila Supabase + ANTHROPIC_API_KEY
npm run ingest -- <argomento> --free
npm run generate -- <argomento> --dry-run   # poi --yes
npm run validate -- <argomento>
npm run review -- <argomento> --level=4,5
npm run import -- <argomento>
```

## 3. Stripe
1. `STRIPE_SECRET_KEY=sk_test_…` in `.env.local` → `npm run stripe:setup` (prezzi + portale).
2. Dopo il deploy: Developers → Webhooks → Add endpoint `https://<dominio>/api/webhooks/stripe`, eventi: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`. Copia il *Signing secret* in `STRIPE_WEBHOOK_SECRET`.
3. Branding (Settings → Branding) e dati attività; ricevute email attive.

## 4. Vercel
1. Importa il repo GitHub (framework Next.js rilevato da solo).
2. Environment Variables (Production): tutte quelle di `.env.example` tranne `ANTHROPIC_API_KEY` e `CLAUDE_MODEL` (servono solo in locale). `NEXT_PUBLIC_SITE_URL=https://<dominio>`.
3. Deploy. Poi Settings → Domains: aggiungi il dominio e imposta i DNS indicati.

## 5. Primo accesso e admin
1. Accedi sul sito col tuo email, poi in Supabase SQL: `update profiles set is_admin = true where email = 'tua@email';` → `/admin`.

## 6. Prova in test mode (prima del live)
- [ ] Login con magic link e con Google.
- [ ] Argomento gratuito: riassunto, mappa, flashcard, quiz (feedback + "Segnala errore" → compare in `/admin`).
- [ ] Argomento premium da utente free: bloccato.
- [ ] Pagamento con carta `4242 4242 4242 4242`: dopo pochi secondi l'account è Premium (webhook ok); portale clienti si apre; esame simulato parte.
- [ ] Pass: acquisto + rimborso dal Dashboard → accesso revocato.
- [ ] Account → scarica dati; elimina account (con abbonamento attivo è bloccato).
- [ ] Da telefono: layout, velocità (Lighthouse ≥ 90).

## 7. Go-live
1. Compila tutti i `TODO_GIOVANNI` (`npm run preflight -- --live` te li elenca), valida i testi legali, conferma prezzi e `passValidUntil`.
2. Stripe in **live**: chiave `sk_live_…` → `npm run stripe:setup` con quella chiave; nuovo webhook live + nuovo `STRIPE_WEBHOOK_SECRET`; aggiorna le env su Vercel e ridistribuisci.
3. `npm run preflight -- --live` deve dire "Nessun blocco".
4. Un acquisto reale di prova (poi rimborsalo).

## Manutenzione (quasi zero)
- Errori segnalati: `/admin` ogni tanto. Dipendenze: Dependabot/`npm audit` mensile. Backup: Supabase (piano Pro per backup giornalieri, valuta dopo i primi ricavi).
