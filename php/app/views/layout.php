<?php /** @var string $content */ $f = flash(); ?>
<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e(($title ?? '') !== cfg('site.name') && !empty($title) ? $title . ' · ' . cfg('site.name') : cfg('site.name')) ?></title>
<meta name="description" content="<?= e(cfg('site.description')) ?>">
<meta name="csrf-token" content="<?= e(csrf_token()) ?>">
<link rel="stylesheet" href="/assets/style.css?v=1">
<script src="/assets/app.js?v=1" defer></script>
</head>
<body>
<header class="topbar">
  <div class="wrap topbar-in">
    <a href="/" class="brand"><?= e(cfg('site.name')) ?></a>
    <nav class="topnav" aria-label="Menu">
      <?php if ($user): ?>
        <a href="/dashboard">Studio</a>
        <a href="/allenatore">Allenatore</a>
        <a href="/esame">Esame</a>
        <a href="/account">Account</a>
        <?php if ($user['is_admin']): ?><a href="/admin">Admin</a><?php endif; ?>
      <?php else: ?>
        <a href="/login">Accedi</a>
        <a href="/registrati" class="btn btn-sm">Inizia gratis</a>
      <?php endif; ?>
    </nav>
  </div>
</header>
<main class="wrap page">
<?php if ($f): ?><p role="status" class="alert <?= $f['type'] === 'err' ? 'alert-err' : 'alert-ok' ?>"><?= e($f['msg']) ?></p><?php endif; ?>
<?= $content ?>
</main>
<footer class="wrap footer">
  <nav aria-label="Pagine legali">
    <a href="/privacy">Privacy</a> <a href="/cookie">Cookie</a> <a href="/termini">Termini</a> <a href="/recesso">Recesso</a> <a href="/disclaimer">Disclaimer</a>
  </nav>
  <p><?= e(cfg('site.name')) ?> — non affiliato a MUR, INDIRE o università. Contenuti originali, non ufficiali.</p>
  <p><?= e(cfg('site.owner.name')) ?> · P.IVA <?= e(cfg('site.owner.vat')) ?> · <?= e(cfg('site.owner.address')) ?></p>
</footer>
</body>
</html>
