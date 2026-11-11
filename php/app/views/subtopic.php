<a href="/argomenti/<?= e($st['topic_id']) ?>" class="small muted">← <?= e($st['topic_title']) ?></a>
<h1><?= e($st['title']) ?></h1>
<nav class="tabs" aria-label="Sezioni">
  <?php foreach ($tabs as $id => $label): ?>
    <a href="?v=<?= e($id) ?>" <?= $v === $id ? 'aria-current="page" class="active"' : '' ?>><?= e($label) ?></a>
  <?php endforeach; ?>
</nav>
<div class="section">
<?php if (!$allowed): ?>
  <div class="card center">
    <p><b>Contenuto Premium 🔒</b></p>
    <p class="small muted">Sblocca tutti gli argomenti, l'allenatore e gli esami simulati.</p>
    <a href="<?= $user ? '/account' : '/registrati' ?>" class="btn"><?= $user ? 'Scegli un piano' : 'Crea un account gratuito' ?></a>
  </div>
<?php elseif ($v === 'mappa'): ?>
  <?php if (!empty($tree)): ?>
    <div class="js-map"><script type="application/json"><?= str_replace(['<', '>', '&'], ['<', '>', '&'], $tree) ?></script></div>
  <?php else: ?><p class="muted small">Contenuto non ancora disponibile.</p><?php endif; ?>
<?php elseif ($v === 'flashcard'): ?>
  <?php if (!$cards): ?>
    <p class="muted small">Nessuna flashcard da ripassare oggi. 🎉</p>
  <?php else: ?>
    <div class="js-cards" data-save="<?= $user ? '1' : '0' ?>"><script type="application/json"><?= json_encode($cards, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script></div>
    <?php if (!$user): ?><p class="small muted">Accedi per salvare i progressi della ripetizione spaziata.</p><?php endif; ?>
  <?php endif; ?>
<?php elseif ($v === 'quiz'): ?>
  <?php if ($level < 1): ?>
    <p class="small muted">Scegli la difficoltà:</p>
    <div class="stack">
      <?php foreach (['Facile', 'Medio', 'Difficile', 'Molto difficile', 'Impossibile'] as $i => $name): ?>
        <a class="card" href="?v=quiz&amp;l=<?= $i + 1 ?>">L<?= $i + 1 ?> · <?= $name ?></a>
      <?php endforeach; ?>
    </div>
  <?php elseif (!$user): ?>
    <div class="card center"><p>Per rispondere ai quiz e vedere le spiegazioni serve un account gratuito.</p><a class="btn" href="/registrati">Crea un account</a> <a href="/login?next=<?= e(rawurlencode($_SERVER['REQUEST_URI'])) ?>">Accedi</a></div>
  <?php else: ?>
    <?php $mode = 'quiz'; require __DIR__ . '/partials_quiz.php'; ?>
    <p class="small"><a href="?v=quiz">← Cambia livello</a></p>
  <?php endif; ?>
<?php elseif ($v === 'media'): ?>
  <?php if (!$media): ?><p class="muted small">Contenuto non ancora disponibile.</p><?php endif; ?>
  <ul class="stack">
  <?php foreach ($media as $m): $p = parse_media_url($m['url']); if (!$p) continue; ?>
    <li>
      <h2 class="h3"><?= $m['kind'] === 'podcast' ? '🎧' : '🎬' ?> <?= e($m['title']) ?> <?php if ($m['duration_s']): ?><span class="small muted"><?= (int) round($m['duration_s'] / 60) ?> min</span><?php endif; ?></h2>
      <?php if ($m['description']): ?><p class="small muted"><?= e($m['description']) ?></p><?php endif; ?>
      <?php if ($p['type'] === 'audio'): ?><audio controls preload="none" src="<?= e($p['src']) ?>"></audio>
      <?php elseif ($p['type'] === 'video'): ?><video controls preload="none" src="<?= e($p['src']) ?>"></video>
      <?php else: ?><div class="embed js-embed" data-src="<?= e($p['src']) ?>"><button type="button" class="btn">▶ Riproduci</button><p class="small muted">Il lettore esterno si carica solo dopo il clic.</p></div><?php endif; ?>
    </li>
  <?php endforeach; ?>
  </ul>
<?php else: ?>
  <?php if (empty($summary)): ?><p class="muted small">Contenuto non ancora disponibile.</p>
  <?php else: $points = json_decode($summary['key_points'], true) ?: []; ?>
    <article class="prose summary"><?= $summary['html'] /* HTML generato dallo script di esportazione a partire dai nostri riassunti */ ?></article>
    <?php if ($points): ?>
      <aside class="keypoints"><h2 class="h3">Punti chiave</h2><ul><?php foreach ($points as $pt): ?><li><?= e($pt) ?></li><?php endforeach; ?></ul></aside>
    <?php endif; ?>
  <?php endif; ?>
<?php endif; ?>
</div>
