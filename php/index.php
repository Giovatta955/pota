<?php
declare(strict_types=1);
// Unico punto di ingresso: tutte le richieste passano da qui (vedi .htaccess).
require __DIR__ . '/app/bootstrap.php';

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = '/' . trim(rawurldecode($path), '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Il webhook Stripe non usa sessione né CSRF (è verificato dalla firma).
if ($path === '/webhook/stripe' && $method === 'POST') {
    require __DIR__ . '/app/routes/webhook.php';
    exit;
}

start_session();
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
if ($method === 'POST') csrf_check();

$routes = [
    '#^/$#' => 'home',
    '#^/(privacy|cookie|termini|recesso|disclaimer)$#' => 'legal',
    '#^/(login|registrati|esci|password-dimenticata|reimposta-password)$#' => 'auth',
    '#^/argomenti/([a-z0-9-]+)$#' => 'topic',
    '#^/argomenti/([a-z0-9-]+)/([a-z0-9-]+)$#' => 'subtopic',
    '#^/api/(risposta|flashcard|segnala|esame-consegna)$#' => 'api',
    '#^/dashboard$#' => 'dashboard',
    '#^/allenatore(/sessione)?$#' => 'trainer',
    '#^/esame(?:/([a-f0-9]{32}))?$#' => 'exam',
    '#^/account(/(checkout|portale|esporta|elimina))?$#' => 'account',
    '#^/admin(/(argomenti|media|spazio))?$#' => 'admin',
];

try {
    foreach ($routes as $re => $file) {
        if (preg_match($re, $path, $m)) {
            array_shift($m);
            $params = $m;
            require __DIR__ . '/app/routes/' . $file . '.php';
            exit;
        }
    }
    not_found();
} catch (Throwable $ex) {
    error_log('[tfa] ' . $ex->getMessage() . ' @ ' . $ex->getFile() . ':' . $ex->getLine());
    http_response_code(500);
    render('errore', ['title' => 'Errore', 'message' => cfg('debug') ? $ex->getMessage() : 'Si è verificato un errore. Riprova tra poco.']);
}
