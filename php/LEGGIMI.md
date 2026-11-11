# Versione PHP + MySQL

Sito completo in PHP "classico", pensato per un hosting condiviso (Aruba, SiteGround, Register, Netsons…). Basta un client FTP e phpMyAdmin: niente Node.js e niente librerie da installare.

Funzioni incluse:

- registrazione e accesso con email e password, recupero password via email;
- argomenti, riassunti, mappe concettuali espandibili, flashcard a ripetizione spaziata, quiz a 5 livelli;
- allenatore (punti deboli), esame simulato con timer, segnalazione errori;
- abbonamento mensile o pass via Stripe, gestione e disdetta dal portale clienti Stripe;
- area Account: esportazione dei dati ed eliminazione dell'account;
- area Admin: segnalazioni e correzione domande, argomenti, podcast e video, numeri del sito.

## Requisiti

- PHP 8.1 o superiore, con le estensioni `pdo_mysql`, `curl` e `mbstring` (sono attive quasi ovunque);
- MySQL 5.7+ oppure MariaDB 10.3+;
- Apache con `mod_rewrite` (è lo standard degli hosting condivisi);
- certificato HTTPS, di solito gratuito con Let's Encrypt dal pannello dell'hosting.

## Installazione in 6 passi

1. **Crea il database**: dal pannello dell'hosting crea un database MySQL con il suo utente e la sua password.
2. **Importa le tabelle**: apri phpMyAdmin, seleziona il database, scheda *Importa*, e carica `sql/schema.sql`.
3. **Importa i contenuti**: sempre da *Importa*, carica `sql/contenuti.sql.gz`.
   - phpMyAdmin accetta il file compresso.
   - Se l'hosting ha un limite basso sulla dimensione dei file, usa `sql/contenuti.sql` diviso in parti o chiedi al supporto di importarlo.
4. **Configura**: copia `app/config.sample.php` in `app/config.php` e compila dati del database, indirizzo del sito, prezzi e chiavi Stripe.
5. **Carica i file**: via FTP, copia **tutto il contenuto** di questa cartella nella cartella pubblica del sito (`public_html`, `www` o `htdocs`). Includi i file nascosti `.htaccess`.
6. **Diventa amministratore**: registrati sul sito con la tua email, poi esegui in phpMyAdmin (scheda *SQL*):

   ```sql
   UPDATE users SET is_admin = 1 WHERE email = 'la-tua-email@esempio.it';
   ```

Le cartelle `app/`, `sql/` e `tools/` sono protette da `.htaccess` e non sono raggiungibili dal browser.

## Stripe (pagamenti)

1. Su dashboard.stripe.com crea due prezzi:
   - un **prezzo ricorrente mensile** per l'abbonamento;
   - un **prezzo una tantum** per il pass.
2. Copia i due ID (`price_...`) in `config.php` (`price_monthly`, `price_pass`).
3. In *Sviluppatori → Webhook* aggiungi l'endpoint `https://tuodominio.it/webhook/stripe` con questi eventi:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.refunded`
4. Copia il *Signing secret* (`whsec_...`) in `config.php`.
5. Attiva il **portale clienti** (*Impostazioni → Billing → Customer portal*): da lì gli utenti disdicono e scaricano le fatture.
6. Prova prima con le chiavi `sk_test_...` e la carta di prova `4242 4242 4242 4242`, poi passa alle chiavi live.

## Email

Il recupero password usa la funzione `mail()` di PHP, che sugli hosting condivisi di solito funziona già. Imposta in `config.php` un mittente del tuo dominio (`mail_from`), altrimenti le email possono finire nello spam.

## Aggiornare i contenuti

I contenuti sono nel file `sql/contenuti.sql`, generato dai file JSON del progetto con:

```
node php/tools/export-mysql.mjs > php/sql/contenuti.sql
```

Il comando va eseguito dalla cartella principale del progetto. Reimportare il file aggiorna domande, riassunti e mappe senza toccare utenti, progressi e abbonamenti. Le correzioni fatte dall'area Admin vanno riportate anche nei file JSON, altrimenti un nuovo import le sovrascrive.

## Prova in locale (facoltativa)

Con PHP e MySQL installati sul computer:

```
php -S 127.0.0.1:8080 tools/dev-router.php
```

Poi apri http://127.0.0.1:8080 (in `config.php` imposta `url` a quell'indirizzo).

## Sicurezza: cosa è già previsto

- Password salvate solo come hash (`password_hash`).
- Protezione CSRF su tutti i moduli.
- Query sempre preparate (niente SQL injection).
- Limite di tentativi di accesso.
- Cookie di sessione `HttpOnly` e `SameSite`.
- La risposta giusta di un quiz arriva al browser solo dopo la risposta dell'utente.
- I webhook Stripe sono verificati con la firma.

Da fare a mano:

- attivare HTTPS (togli il commento nelle due righe indicate in `.htaccess`);
- non lasciare mai `debug => true` sul sito pubblico;
- fare backup periodici del database (molti hosting li fanno in automatico).

## Differenze rispetto alla versione Next.js

- L'accesso è con email e password, invece del link via email.
- Podcast e video si aggiungono come link (YouTube, Vimeo, Spotify o file `.mp3`/`.mp4` già online). Non c'è il caricamento di file dal pannello.
- I testi legali sono bozze con i segnaposto `TODO_GIOVANNI`, da completare come nella versione attuale.
