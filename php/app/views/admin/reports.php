<?php require __DIR__ . '/nav.php'; ?>
<h1>Segnalazioni aperte (<?= count($reports) ?>)</h1>
<?php if (!$reports): ?><p class="muted small">Nessuna segnalazione aperta.</p><?php endif; ?>
<?php foreach ($reports as $r): $opts = json_decode($r['options'], true) ?: []; ?>
<section class="card stack">
  <p class="small"><b>Nota utente:</b> <?= e($r['note']) ?></p>
  <form method="post" action="/admin" class="form">
    <?= csrf_field() ?><input type="hidden" name="do" value="question"><input type="hidden" name="id" value="<?= e($r['question_id']) ?>">
    <p class="small muted"><?= e($r['question_id']) ?> · L<?= (int) $r['level'] ?> · corretta: <?= e($r['correct']) ?></p>
    <textarea name="stem" rows="3"><?= e($r['stem']) ?></textarea>
    <ul class="small"><?php foreach ($opts as $o): ?><li><?= $o['key'] === $r['correct'] ? '✔' : '•' ?> <?= e($o['key'] . ') ' . $o['text']) ?></li><?php endforeach; ?></ul>
    <textarea name="explanation" rows="3"><?= e($r['explanation']) ?></textarea>
    <label class="check small"><input type="checkbox" name="active" value="1" <?= $r['active'] ? 'checked' : '' ?>> Attiva (visibile agli utenti)</label>
    <button class="btn btn-sm">Salva domanda</button>
  </form>
  <form method="post" action="/admin" class="row">
    <?= csrf_field() ?><input type="hidden" name="do" value="report"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
    <button name="status" value="resolved" class="btn btn-ghost btn-sm">Risolta</button>
    <button name="status" value="dismissed" class="btn btn-ghost btn-sm">Scarta</button>
  </form>
</section>
<?php endforeach; ?>
