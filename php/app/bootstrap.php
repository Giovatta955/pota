<?php
declare(strict_types=1);

// ---------- Configurazione ----------
$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) {
    http_response_code(500);
    exit('Manca app/config.php: copia app/config.sample.php in app/config.php e compilalo.');
}
$GLOBALS['CFG'] = require $cfgFile;

function cfg(string $path, $default = null)
{
    $v = $GLOBALS['CFG'];
    foreach (explode('.', $path) as $k) {
        if (!is_array($v) || !array_key_exists($k, $v)) return $default;
        $v = $v[$k];
    }
    return $v;
}

date_default_timezone_set('Europe/Rome');
mb_internal_encoding('UTF-8');
if (cfg('debug')) {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
}

require __DIR__ . '/logic.php';
require __DIR__ . '/stripe.php';

// ---------- Database ----------
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . cfg('db.host') . ';dbname=' . cfg('db.name') . ';charset=utf8mb4';
        $pdo = new PDO($dsn, (string) cfg('db.user'), (string) cfg('db.pass'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec("SET time_zone = '" . (new DateTime())->format('P') . "'");
    }
    return $pdo;
}

function q(string $sql, array $params = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st;
}

function q_all(string $sql, array $params = []): array { return q($sql, $params)->fetchAll(); }
function q_one(string $sql, array $params = []): ?array { $r = q($sql, $params)->fetch(); return $r === false ? null : $r; }
function q_val(string $sql, array $params = []) { $r = q($sql, $params)->fetchColumn(); return $r === false ? null : $r; }

/** Segnaposto "?, ?, ?" per clausole IN. */
function in_list(array $values): string { return implode(',', array_fill(0, max(1, count($values)), '?')); }

// ---------- Sessione ----------
function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('tfa_sess');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

// ---------- Utilità ----------
function e($s): string { return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function url(string $path = '/'): string { return rtrim((string) cfg('site.url'), '/') . $path; }

function redirect(string $path): void
{
    header('Location: ' . $path, true, 303);
    exit;
}

function not_found(): void
{
    http_response_code(404);
    render('errore', ['title' => 'Pagina non trovata', 'message' => 'La pagina che cerchi non esiste.']);
    exit;
}

function json_out(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function flash(?string $msg = null, string $type = 'ok'): ?array
{
    if ($msg !== null) {
        $_SESSION['flash'] = ['msg' => $msg, 'type' => $type];
        return null;
    }
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}

function today(): string { return date('Y-m-d'); }
function now_sql(): string { return date('Y-m-d H:i:s'); }

// ---------- CSRF ----------
function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}
function csrf_field(): string { return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">'; }
function csrf_check(): void
{
    $sent = $_POST['_csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        http_response_code(419);
        exit('Sessione scaduta: torna indietro e ricarica la pagina.');
    }
}

// ---------- Utente e accesso ----------
function current_user(): ?array
{
    static $u = false;
    if ($u !== false) return $u;
    $id = $_SESSION['uid'] ?? null;
    $u = $id ? q_one('SELECT id, email, is_admin FROM users WHERE id = ?', [$id]) : null;
    return $u;
}

function require_login(): array
{
    $u = current_user();
    if (!$u) redirect('/login?next=' . rawurlencode($_SERVER['REQUEST_URI'] ?? '/'));
    return $u;
}

function require_admin(): array
{
    $u = require_login();
    if (!$u['is_admin']) not_found();
    return $u;
}

function has_paid_access(?array $u): bool
{
    if (!$u) return false;
    if ($u['is_admin']) return true;
    static $cache = [];
    $id = (int) $u['id'];
    if (!isset($cache[$id])) {
        $cache[$id] = (bool) q_val(
            "SELECT 1 FROM subscriptions WHERE user_id = ? AND status IN ('active','trialing')
             AND (current_period_end IS NULL OR current_period_end > NOW()) LIMIT 1",
            [$id]
        );
    }
    return $cache[$id];
}

function can_read_subtopic(array $subtopic, ?array $u): bool
{
    return (bool) $subtopic['is_free'] || has_paid_access($u);
}

/** Verifica che l'utente possa leggere il sottoargomento di una domanda/flashcard. */
function can_read_subtopic_id(string $subtopicId, ?array $u): bool
{
    $st = q_one('SELECT id, is_free FROM subtopics WHERE id = ?', [$subtopicId]);
    return $st !== null && can_read_subtopic($st, $u);
}

// ---------- Viste ----------
function render(string $view, array $vars = [], bool $layout = true): void
{
    extract($vars, EXTR_SKIP);
    $user = current_user();
    ob_start();
    require __DIR__ . '/views/' . $view . '.php';
    $content = ob_get_clean();
    if ($layout) require __DIR__ . '/views/layout.php';
    else echo $content;
}

function price_eur(float $v): string { return number_format($v, 2, ',', '.') . ' €'; }
