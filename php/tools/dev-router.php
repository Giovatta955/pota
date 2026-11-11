<?php
// Solo per prove in locale: php -S 127.0.0.1:8080 tools/dev-router.php
$f = __DIR__ . '/..' . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($_SERVER['REQUEST_URI'], '/assets/') && is_file($f)) return false;
require __DIR__ . '/../index.php';
