<h1>Le tue fragilità</h1>
<a href="/allenatore/sessione" class="btn btn-block">Avvia sessione allenatore</a>
<?php if (!$paid): ?><p class="small muted">Con il piano gratuito l'allenatore usa solo gli argomenti gratuiti.</p><?php endif; ?>
<?php if (!$ranked): ?>
  <p class="muted small">Rispondi a qualche quiz: qui vedrai gli argomenti da rinforzare.</p>
<?php else: ?>
<ul class="list">
  <?php foreach ($ranked as $r): ?>
  <li class="row-between">
    <div><b><?= e($titles[$r['topic_id']] ?? $r['topic_id']) ?></b>
      <div class="small muted">Precisione <?= (int) round($r['accuracy_ema'] * 100) ?>% · livello <?= (int) $r['current_level'] ?> · <?= (int) $r['n_answers'] ?> risposte</div></div>
    <a class="btn btn-ghost btn-sm" href="/allenatore/sessione?topic=<?= e($r['topic_id']) ?>">Allenati</a>
  </li>
  <?php endforeach; ?>
</ul>
<?php endif; ?>
