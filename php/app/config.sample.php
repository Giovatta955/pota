<?php
// Copia questo file in config.php e compila i valori.
// config.php contiene password e chiavi: NON condividerlo e non metterlo su GitHub.
return [
    'site' => [
        'name' => 'Preparazione TFA Sostegno',          // TODO_GIOVANNI: nome definitivo
        'url' => 'https://www.tuodominio.it',            // senza barra finale
        'description' => 'Riassunti, mappe, flashcard, quiz a 5 livelli ed esami simulati per TFA e concorsi sostegno.',
        'mail_from' => 'noreply@tuodominio.it',         // mittente email (reset password)
        'updated' => '2026-11-11',
        'owner' => [
            'name' => 'TODO_GIOVANNI',
            'vat' => 'TODO_GIOVANNI',
            'address' => 'TODO_GIOVANNI',
            'email' => 'TODO_GIOVANNI',
        ],
    ],
    'db' => [
        'host' => 'localhost',
        'name' => 'nome_database',
        'user' => 'utente_database',
        'pass' => 'password_database',
    ],
    'stripe' => [
        'secret_key' => 'sk_test_...',                    // chiave segreta (test o live)
        'webhook_secret' => 'whsec_...',                  // dal webhook creato su Stripe
        // ID dei prezzi su Stripe (Prodotti → prezzo → "price_..."); se vuoti si usano le lookup key tfa_monthly / tfa_pass
        'price_monthly' => '',
        'price_pass' => '',
        'tax_code' => 'txcd_10000000',
    ],
    'prices' => [
        'monthly_eur' => 9.90,                            // TODO_GIOVANNI
        'pass_eur' => 39,                                 // TODO_GIOVANNI
        'pass_valid_until' => '',                         // data concorso AAAA-MM-GG; vuoto = 12 mesi dall'acquisto
    ],
    'exam' => [
        'min' => 30,
        'max' => 50,
        'level_mix' => [0.2, 0.3, 0.3, 0.15, 0.05],
        'seconds_per_question' => 90,
    ],
    'debug' => false,                                     // true solo in prova: mostra gli errori a schermo
];
