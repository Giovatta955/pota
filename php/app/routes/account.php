<?php
$u = require_login();
$uid = (int) $u['id'];
$sub = $params[1] ?? null;

if ($sub === 'checkout' && $method === 'POST') {
    if (empty($_POST['consenso'])) redirect('/account?errore=consenso');
    $plan = ($_POST['plan'] ?? '') === 'pass' ? 'pass' : 'monthly';
    q('UPDATE users SET withdrawal_consent_at = NOW() WHERE id = ?', [$uid]);
    try {
        header('Location: ' . stripe_checkout_url($u, $plan), true, 303);
    } catch (Throwable $e) {
        error_log('[tfa checkout] ' . $e->getMessage());
        redirect('/account?errore=pagamento');
    }
    exit;
}

if ($sub === 'portale' && $method === 'POST') {
    $cust = stripe_customer_id($uid);
    if (!$cust) redirect('/account');
    try {
        header('Location: ' . stripe_portal_url($cust), true, 303);
    } catch (Throwable $e) {
        error_log('[tfa portal] ' . $e->getMessage());
        redirect('/account?errore=pagamento');
    }
    exit;
}

if ($sub === 'esporta') {
    $data = [
        'account' => q_one('SELECT email, created_at, withdrawal_consent_at FROM users WHERE id = ?', [$uid]),
        'abbonamenti' => q_all('SELECT plan, status, current_period_end, updated_at FROM subscriptions WHERE user_id = ?', [$uid]),
        'risposte' => q_all('SELECT question_id, answer, is_correct, mode, created_at FROM attempts WHERE user_id = ? ORDER BY id', [$uid]),
        'statistiche' => q_all('SELECT topic_id, accuracy_ema, current_level, n_answers FROM topic_stats WHERE user_id = ?', [$uid]),
        'flashcard' => q_all('SELECT flashcard_id, ease, interval_days, repetitions, due_date FROM flashcard_progress WHERE user_id = ?', [$uid]),
        'esami' => q_all('SELECT id, started_at, submitted_at, score FROM exams WHERE user_id = ?', [$uid]),
        'segnalazioni' => q_all('SELECT question_id, note, status, created_at FROM reports WHERE user_id = ?', [$uid]),
    ];
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="i-miei-dati.json"');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($sub === 'elimina' && $method === 'POST') {
    if (trim((string) ($_POST['conferma'] ?? '')) !== 'ELIMINA') redirect('/account?errore=conferma');
    $activeMonthly = q_val("SELECT 1 FROM subscriptions WHERE user_id = ? AND plan = 'monthly' AND status IN ('active','trialing','past_due')", [$uid]);
    if ($activeMonthly) redirect('/account?errore=abbonamento');
    q('DELETE FROM users WHERE id = ?', [$uid]); // a cascata: progressi, esami, abbonamenti
    $_SESSION = [];
    session_destroy();
    redirect('/?eliminato=1');
}

$errors = [
    'consenso' => 'Devi spuntare la richiesta di accesso immediato per procedere.',
    'conferma' => 'Per eliminare l\'account scrivi ELIMINA nel campo di conferma.',
    'abbonamento' => 'Prima di eliminare l\'account annulla l\'abbonamento da "Gestisci abbonamento".',
    'pagamento' => 'Il servizio di pagamento non è raggiungibile. Riprova tra poco.',
];
$subs = q_all('SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC', [$uid]);
render('account', [
    'title' => 'Account', 'paid' => has_paid_access($u), 'subs' => $subs, 'hasCustomer' => (bool) stripe_customer_id($uid),
    'ok' => isset($_GET['ok']), 'error' => $errors[$_GET['errore'] ?? ''] ?? null,
]);
