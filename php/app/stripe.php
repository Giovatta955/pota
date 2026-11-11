<?php
declare(strict_types=1);
// Integrazione Stripe senza librerie esterne: chiamate HTTPS con cURL e verifica firma dei webhook.

function stripe_api(string $method, string $path, array $params = [], ?string $idempotencyKey = null): array
{
    $key = (string) cfg('stripe.secret_key');
    if ($key === '' || str_starts_with($key, 'sk_...')) throw new RuntimeException('Chiave Stripe mancante in config.php');
    $url = 'https://api.stripe.com/v1/' . ltrim($path, '/');
    $body = http_build_query($params, '', '&');
    if ($method === 'GET' && $body !== '') $url .= '?' . $body;
    $headers = ['Authorization: Bearer ' . $key, 'Stripe-Version: 2024-06-20'];
    if ($idempotencyKey) $headers[] = 'Idempotency-Key: ' . $idempotencyKey;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30,
    ]);
    if ($method !== 'GET') curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $res = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($res === false) throw new RuntimeException('Stripe non raggiungibile: ' . $err);
    $data = json_decode((string) $res, true) ?: [];
    if ($code >= 400) throw new RuntimeException('Errore Stripe: ' . ($data['error']['message'] ?? $code));
    return $data;
}

function stripe_price(string $plan): string
{
    $override = (string) cfg($plan === 'monthly' ? 'stripe.price_monthly' : 'stripe.price_pass', '');
    if ($override !== '') return $override;
    $lookup = $plan === 'monthly' ? 'tfa_monthly' : 'tfa_pass';
    $r = stripe_api('GET', 'prices', ['lookup_keys' => [$lookup], 'active' => 'true', 'limit' => 1]);
    $id = $r['data'][0]['id'] ?? null;
    if (!$id) throw new RuntimeException("Prezzo '$lookup' non trovato su Stripe: indica price_monthly / price_pass in config.php");
    return $id;
}

function stripe_customer_id(int $userId): ?string
{
    $v = q_val('SELECT provider_customer_id FROM subscriptions WHERE user_id = ? AND provider_customer_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1', [$userId]);
    return $v ? (string) $v : null;
}

function stripe_checkout_url(array $user, string $plan): string
{
    $meta = ['user_id' => (string) $user['id'], 'plan' => $plan];
    $p = [
        'mode' => $plan === 'monthly' ? 'subscription' : 'payment',
        'line_items' => [['price' => stripe_price($plan), 'quantity' => 1]],
        'success_url' => url('/account?ok=1'),
        'cancel_url' => url('/account'),
        'client_reference_id' => (string) $user['id'],
        'metadata' => $meta,
        'locale' => 'it',
        'allow_promotion_codes' => 'true',
        'billing_address_collection' => 'required',
        'tax_id_collection' => ['enabled' => 'true'],
    ];
    if ($plan === 'monthly') {
        $p['subscription_data'] = ['metadata' => $meta];
    } else {
        $p['payment_intent_data'] = ['metadata' => $meta];
        $p['invoice_creation'] = ['enabled' => 'true', 'invoice_data' => ['metadata' => $meta]];
    }
    $cust = stripe_customer_id((int) $user['id']);
    if ($cust) $p['customer'] = $cust;
    else {
        $p['customer_email'] = $user['email'];
        if ($plan === 'pass') $p['customer_creation'] = 'always';
    }
    $s = stripe_api('POST', 'checkout/sessions', $p, 'checkout_' . $user['id'] . '_' . $plan . '_' . intdiv(time(), 60));
    if (empty($s['url'])) throw new RuntimeException('Stripe non ha restituito il link di pagamento');
    return $s['url'];
}

function stripe_portal_url(string $customerId): string
{
    $s = stripe_api('POST', 'billing_portal/sessions', ['customer' => $customerId, 'return_url' => url('/account')]);
    return $s['url'];
}

/** Verifica la firma Stripe-Signature (t=...,v1=...) con tolleranza di 5 minuti. */
function stripe_verify(string $payload, string $header, string $secret, int $tolerance = 300): bool
{
    $t = null;
    $sigs = [];
    foreach (explode(',', $header) as $part) {
        [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($k === 't') $t = (int) $v;
        if ($k === 'v1') $sigs[] = $v;
    }
    if (!$t || !$sigs || abs(time() - $t) > $tolerance) return false;
    $expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
    foreach ($sigs as $s) if (hash_equals($expected, $s)) return true;
    return false;
}

function pass_end(): string
{
    $d = (string) cfg('prices.pass_valid_until', '');
    if ($d !== '' && strtotime($d) > time()) return date('Y-m-d 23:59:59', strtotime($d));
    return date('Y-m-d H:i:s', strtotime('+1 year'));
}

function stripe_id($v): ?string { return is_array($v) ? ($v['id'] ?? null) : ($v ?: null); }

function upsert_subscription(array $s): void
{
    q('INSERT INTO subscriptions (user_id, provider, provider_customer_id, provider_subscription_id, plan, status, current_period_end)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), current_period_end = VALUES(current_period_end),
         provider_customer_id = COALESCE(VALUES(provider_customer_id), provider_customer_id)',
        [$s['user_id'], 'stripe', $s['customer'], $s['sub_id'], $s['plan'], $s['status'], $s['end']]);
}

/** Traduce un evento Stripe in aggiornamento dell'abbonamento. */
function stripe_handle_event(array $ev): void
{
    $o = $ev['data']['object'] ?? [];
    $meta = $o['metadata'] ?? [];
    $uid = isset($meta['user_id']) ? (int) $meta['user_id'] : 0;
    if ($uid <= 0 || !q_val('SELECT 1 FROM users WHERE id = ?', [$uid])) return;
    switch ($ev['type'] ?? '') {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
            if (($o['mode'] ?? '') !== 'payment' || ($o['payment_status'] ?? '') !== 'paid' || ($meta['plan'] ?? '') !== 'pass') return;
            upsert_subscription(['user_id' => $uid, 'customer' => stripe_id($o['customer'] ?? null), 'sub_id' => 'pass_' . (stripe_id($o['payment_intent'] ?? null) ?? $o['id']),
                'plan' => 'pass', 'status' => 'active', 'end' => pass_end()]);
            return;
        case 'charge.refunded':
            if (empty($o['refunded']) || ($meta['plan'] ?? '') !== 'pass' || empty($o['payment_intent'])) return;
            upsert_subscription(['user_id' => $uid, 'customer' => stripe_id($o['customer'] ?? null), 'sub_id' => 'pass_' . stripe_id($o['payment_intent']),
                'plan' => 'pass', 'status' => 'refunded', 'end' => now_sql()]);
            return;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            $end = $o['current_period_end'] ?? ($o['items']['data'][0]['current_period_end'] ?? null);
            upsert_subscription(['user_id' => $uid, 'customer' => stripe_id($o['customer'] ?? null), 'sub_id' => $o['id'],
                'plan' => 'monthly', 'status' => (string) $o['status'], 'end' => $end ? date('Y-m-d H:i:s', (int) $end) : null]);
            return;
    }
}
