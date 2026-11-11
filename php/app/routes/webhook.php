<?php
// Webhook Stripe: verifica firma, evita doppie elaborazioni, aggiorna l'abbonamento.
$payload = (string) file_get_contents('php://input');
$sig = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
$secret = (string) cfg('stripe.webhook_secret');
if ($secret === '' || !stripe_verify($payload, $sig, $secret)) {
    http_response_code(400);
    exit('firma non valida');
}
$ev = json_decode($payload, true);
if (!is_array($ev) || empty($ev['id'])) {
    http_response_code(400);
    exit('evento non valido');
}
try {
    db()->beginTransaction();
    $ins = q('INSERT IGNORE INTO stripe_events (id) VALUES (?)', [$ev['id']]);
    if ($ins->rowCount() === 1) stripe_handle_event($ev);
    db()->commit();
} catch (Throwable $e) {
    if (db()->inTransaction()) db()->rollBack();
    error_log('[tfa webhook] ' . $e->getMessage());
    http_response_code(500); // Stripe riproverà
    exit('errore');
}
http_response_code(200);
echo 'ok';
