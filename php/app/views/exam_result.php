<h1>Risultato</h1>
<div class="card center accent-bg">
  <div class="huge"><?= (int) round($g['score'] * 100) ?>%</div>
  <div class="small muted"><?= $g['right'] ?> corrette · <?= $g['wrong'] ?> errate · <?= $g['blank'] ?> senza risposta su <?= $g['total'] ?></div>
</div>
<h2 class="h3">Dove ripassare</h2>
<?php if (!$g['weak']): ?><p>Nessun errore. Ottimo!</p><?php else: ?>
<ul class="list small">
  <?php foreach ($g['weak'] as $t): ?>
  <li class="row-between"><span><?= e($titles[$t['topic_id']] ?? $t['topic_id']) ?> — <?= $t['wrong'] ?>/<?= $t['total'] ?> errate</span>
  <span><a href="/argomenti/<?= e($t['topic_id']) ?>">Ripassa</a> · <a href="/allenatore/sessione?topic=<?= e($t['topic_id']) ?>">Allenati</a></span></li>
  <?php endforeach; ?>
</ul>
<?php endif; ?>
<?php if ($wrongList): ?>
<details class="card"><summary>Rivedi le domande sbagliate o senza risposta (<?= count($wrongList) ?>)</summary>
  <?php foreach ($wrongList as $q): $opts = array_column(json_decode($q['options'], true), 'text', 'key'); $a = $answers[$q['id']] ?? null; ?>
  <div class="review">
    <p><b><?= e($q['stem']) ?></b></p>
    <p class="small">La tua risposta: <?= $a ? e($a . ') ' . ($opts[$a] ?? '')) : '<i>nessuna</i>' ?></p>
    <p class="small ok">Corretta: <?= e($q['correct'] . ') ' . ($opts[$q['correct']] ?? '')) ?></p>
    <p class="small muted"><?= e($q['explanation']) ?></p>
  </div>
  <?php endforeach; ?>
</details>
<?php endif; ?>
<p><a href="/esame" class="btn btn-ghost">Nuovo esame</a></p>
