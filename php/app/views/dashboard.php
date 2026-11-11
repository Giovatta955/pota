<h1>Ciao, <?= e(explode('@', $user['email'])[0]) ?></h1>
<?php if (!$paid): ?><p class="alert alert-info">Stai usando la versione gratuita. <a href="/account"><b>Sblocca tutto</b></a></p><?php endif; ?>
<div class="grid2">
  <div class="card"><div class="big"><?= (int) $due ?></div><div class="small muted">flashcard da ripassare oggi</div></div>
  <a href="/allenatore" class="card"><div class="small muted">Punti deboli</div><div><b>Le tue fragilità →</b></div></a>
</div>
<?php if ($weak): ?>
<section><h2 class="h3">Da rinforzare</h2>
<ul class="small"><?php foreach ($weak as $w): ?><li><?= e($w['title']) ?> — <?= (int) round($w['accuracy_ema'] * 100) ?>%</li><?php endforeach; ?></ul></section>
<?php endif; ?>
<section><h2 class="h3">Argomenti</h2>
<ul class="list"><?php foreach ($topics as $t): ?><li><a href="/argomenti/<?= e($t['id']) ?>"><?= e($t['title']) ?></a></li><?php endforeach; ?>
<?php if (!$topics): ?><li class="muted small">Nessun argomento ancora importato.</li><?php endif; ?></ul></section>
<form method="post" action="/esci"><?= csrf_field() ?><button class="linkbtn small">Esci</button></form>
