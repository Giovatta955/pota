# Deploy (Netlify + Supabase + Stripe)

Tempo stimato: ~1 ora. Costi: Supabase e Netlify gratuiti per iniziare (Netlify free ammette l'uso commerciale; Vercel Hobby no); dominio ~10–15 €/anno; Stripe a commissione.

## 1. Supabase
1. Crea un progetto (regione UE). Annota **Project URL**, **publishable key** (ex anon), **secret key** (ex service role) (Settings → API).
2. SQL editor → incolla ed esegui, in ordine, `supabase/migrations/0001_init.sql` poi `0002_media.sql`, `0003_media_storage.sql` (podcast e video, bucket privato) e `0004_free_tier.sql` (pulizia automatica e misura dello spazio).
3. Authentication → URL Configuration: *Site URL* = `https://<dominio>`; *Redirect URLs* aggiungi `https://<dominio>/auth/callback` e `http://localhost:3000/auth/callback`.
4. Authentication → Providers: Email (magic link) attivo; Google se vuoi (client ID/secret da Google Cloud Console; redirect = URL di callback indicato da Supabase).
5. Authentication → Email templates: personalizza il "Magic Link" in italiano (fa da email di benvenuto).
6. **Obbligatorio prima del lancio** — Authentication → SMTP: il mittente predefinito di Supabase è pensato solo per le prove (pochissime email l'ora). Usa un SMTP gratuito, es. Resend (piano free con alcune migliaia di email al mese): crea l'account, verifica il dominio, copia le credenziali SMTP in Supabase.

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

## 4. Netlify
1. app.netlify.com → accedi con GitHub → **Add new project → Import an existing project → GitHub** → repo `pota`.
2. **Branch to deploy**: il branch con il codice (oggi `claude/tfa-platform-setup-wexwn6`; dopo il merge, `master`). Nome progetto es. `tfa-sostegno` → URL `https://tfa-sostegno.netlify.app`. Le impostazioni di build arrivano da `netlify.toml`.
3. **Environment variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL` (= URL Netlify o dominio). Non servono `ANTHROPIC_API_KEY` né `CLAUDE_MODEL`.
   - Attenzione: in **Key** va il NOME (es. `STRIPE_WEBHOOK_SECRET`), il segreto va in **Values → Production**. Spunta "Contains secret values" (scope Builds/Functions/Runtime). Dopo ogni modifica alle variabili serve una nuova pubblicazione.
4. **Crediti**: il sito si ripubblica solo se l'ultimo commit contiene `[deploy]` (vedi `netlify.toml`); dopo aver cambiato una variabile: Deploys → Trigger deploy. Controlla il consumo in Netlify → Usage; se finiscono il sito si ferma fino al mese dopo → passa a Personal (9 $/mese) quando hai abbonati.
5. Dominio: Domain management → Add a domain, poi i DNS indicati.

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
2. Stripe in **live**: chiave `sk_live_…` → `npm run stripe:setup` con quella chiave; nuovo webhook live + nuovo `STRIPE_WEBHOOK_SECRET`; aggiorna le env su Netlify e ripubblica (Trigger deploy).
3. `npm run preflight -- --live` deve dire "Nessun blocco".
4. Un acquisto reale di prova (poi rimborsalo).

## Restare nel piano gratuito
- `/admin/spazio` mostra database e file rispetto ai limiti free (500 MB / 1 GB); diventa rosso oltre l'80%.
- Lo storico risposte si pulisce da solo ogni domenica (ultimi 12 mesi, max 3000 per utente).
- Podcast in M4A/MP3, non WAV. Il traffico (5 GB/mese) si controlla in Supabase → Usage.
- Pausa: il progetto free si sospende dopo ~1 settimana senza visite; con utenti attivi non succede, e in ogni caso si riattiva dal pannello senza perdere dati.
- Backup: `.github/workflows/backup.yml` ogni lunedì, cifrato. Crea in GitHub → Settings → Secrets → Actions: `SUPABASE_DB_URL` (Connetti → Session pooler, con la password) e `BACKUP_PASSPHRASE` (frase lunga da conservare). Si scarica da Actions → Backup database → Artifacts (90 giorni). Per ripristinare: `gpg -d file.gpg | gunzip | psql "<connection string>"`.
- Quando passare a Pro (~25 $/mese): spazio oltre l'80%, oppure appena gli abbonati coprono la spesa (bastano 3).

## Manutenzione (quasi zero)
- Errori segnalati: `/admin` ogni tanto. Dipendenze: Dependabot/`npm audit` mensile. Backup: Supabase (piano Pro per backup giornalieri, valuta dopo i primi ricavi).
