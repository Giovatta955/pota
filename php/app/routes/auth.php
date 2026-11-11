<?php
$action = $params[0];
$safeNext = function (?string $n): string {
    return ($n && str_starts_with($n, '/') && !str_starts_with($n, '//') && !str_contains($n, '\\')) ? $n : '/dashboard';
};
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$login = function (int $uid) {
    session_regenerate_id(true);
    $_SESSION['uid'] = $uid;
};

if ($action === 'esci') {
    if ($method !== 'POST') redirect('/');
    $_SESSION = [];
    session_destroy();
    redirect('/');
}

if ($action === 'login') {
    if (current_user()) redirect('/dashboard');
    $error = null;
    $email = '';
    if ($method === 'POST') {
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $pass = (string) ($_POST['password'] ?? '');
        $fails = (int) q_val('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND created_at > (NOW() - INTERVAL 15 MINUTE)', [$ip]);
        if ($fails >= 10) {
            $error = 'Troppi tentativi. Riprova tra 15 minuti.';
        } else {
            $u = q_one('SELECT id, password_hash FROM users WHERE email = ?', [$email]);
            if ($u && password_verify($pass, $u['password_hash'])) {
                if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT))
                    q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($pass, PASSWORD_DEFAULT), $u['id']]);
                q('DELETE FROM login_attempts WHERE ip = ?', [$ip]);
                $login((int) $u['id']);
                redirect($safeNext($_POST['next'] ?? null));
            }
            q('INSERT INTO login_attempts (ip, email) VALUES (?, ?)', [$ip, mb_substr($email, 0, 255)]);
            $error = 'Email o password non corretti.';
        }
    }
    render('auth/login', ['title' => 'Accedi', 'error' => $error, 'email' => $email, 'next' => $safeNext($_GET['next'] ?? ($_POST['next'] ?? null))]);
    exit;
}

if ($action === 'registrati') {
    if (current_user()) redirect('/dashboard');
    $error = null;
    $email = '';
    if ($method === 'POST') {
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $pass = (string) ($_POST['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 255) $error = 'Inserisci un indirizzo email valido.';
        elseif (mb_strlen($pass) < 8) $error = 'La password deve avere almeno 8 caratteri.';
        elseif ($pass !== (string) ($_POST['password2'] ?? '')) $error = 'Le due password non coincidono.';
        elseif (empty($_POST['termini'])) $error = 'Devi accettare termini di servizio e informativa privacy.';
        elseif (q_val('SELECT 1 FROM users WHERE email = ?', [$email])) $error = 'Esiste già un account con questa email: accedi.';
        else {
            q('INSERT INTO users (email, password_hash) VALUES (?, ?)', [$email, password_hash($pass, PASSWORD_DEFAULT)]);
            $login((int) db()->lastInsertId());
            flash('Account creato. Benvenuto!');
            redirect('/dashboard');
        }
    }
    render('auth/register', ['title' => 'Crea un account', 'error' => $error, 'email' => $email]);
    exit;
}

if ($action === 'password-dimenticata') {
    $sent = false;
    if ($method === 'POST') {
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $recent = (int) q_val('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND created_at > (NOW() - INTERVAL 15 MINUTE)', [$ip]);
        q('INSERT INTO login_attempts (ip, email) VALUES (?, ?)', [$ip, mb_substr($email, 0, 255)]);
        $u = $recent < 10 ? q_one('SELECT id FROM users WHERE email = ?', [$email]) : null;
        if ($u) {
            $token = bin2hex(random_bytes(32));
            q('DELETE FROM password_resets WHERE user_id = ? OR expires_at < NOW()', [$u['id']]);
            q('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, NOW() + INTERVAL 1 HOUR)', [hash('sha256', $token), $u['id']]);
            $link = url('/reimposta-password?t=' . $token);
            $subject = '=?UTF-8?B?' . base64_encode('Reimposta la password - ' . cfg('site.name')) . '?=';
            $body = "Ciao,\n\nper scegliere una nuova password apri questo link (valido 1 ora):\n$link\n\nSe non hai chiesto tu il cambio, ignora questa email.\n";
            $headers = 'From: ' . cfg('site.mail_from') . "\r\nContent-Type: text/plain; charset=UTF-8";
            @mail($email, $subject, $body, $headers);
        }
        $sent = true; // stessa risposta sempre: non riveliamo se l'email esiste
    }
    render('auth/forgot', ['title' => 'Password dimenticata', 'sent' => $sent]);
    exit;
}

if ($action === 'reimposta-password') {
    $token = (string) ($_GET['t'] ?? $_POST['t'] ?? '');
    $row = preg_match('/^[a-f0-9]{64}$/', $token) ? q_one('SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > NOW()', [hash('sha256', $token)]) : null;
    $error = null;
    if ($row && $method === 'POST') {
        $pass = (string) ($_POST['password'] ?? '');
        if (mb_strlen($pass) < 8) $error = 'La password deve avere almeno 8 caratteri.';
        elseif ($pass !== (string) ($_POST['password2'] ?? '')) $error = 'Le due password non coincidono.';
        else {
            q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($pass, PASSWORD_DEFAULT), $row['user_id']]);
            q('DELETE FROM password_resets WHERE user_id = ?', [$row['user_id']]);
            $login((int) $row['user_id']);
            flash('Password aggiornata.');
            redirect('/dashboard');
        }
    }
    render('auth/reset', ['title' => 'Nuova password', 'valid' => (bool) $row, 'token' => $token, 'error' => $error]);
    exit;
}
