<a href="/" class="small muted">← Home</a>
<h1><?= e($topic['title']) ?></h1>
<ul class="list">
<?php foreach ($subs as $s): ?>
  <li><a href="/argomenti/<?= e($topic['id']) ?>/<?= e($s['id']) ?>" class="row-between">
    <span><?= e($s['title']) ?></span>
    <span class="small <?= $s['is_free'] ? 'ok' : 'muted' ?>"><?= $s['is_free'] ? 'Gratis' : '🔒 Premium' ?></span>
  </a></li>
<?php endforeach; ?>
</ul>
