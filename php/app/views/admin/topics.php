<?php require __DIR__ . '/nav.php'; ?>
<h1>Argomenti e sottoargomenti</h1>
<p class="small muted">Per modificare, reinserisci lo stesso id con i nuovi valori. Riassunti, mappe, flashcard e domande si caricano da file SQL (vedi LEGGIMI).</p>
<details class="card"><summary>Nuovo / modifica argomento</summary>
<form method="post" class="form"><?= csrf_field() ?><input type="hidden" name="do" value="topic">
  <label>Id (es. legislazione-inclusione) <input name="id" required pattern="[a-z0-9]+(-[a-z0-9]+)*"></label>
  <label>Titolo <input name="title" required></label>
  <label>Posizione <input name="position" type="number" value="0" class="w-small"></label>
  <label>Peso nell'esame <input name="exam_weight" type="number" step="0.1" value="1" class="w-small"></label>
  <button class="btn btn-sm">Salva</button></form></details>
<details class="card"><summary>Nuovo / modifica sottoargomento</summary>
<form method="post" class="form"><?= csrf_field() ?><input type="hidden" name="do" value="subtopic">
  <label>Argomento <select name="topic_id"><?php foreach ($topics as $t): ?><option value="<?= e($t['id']) ?>"><?= e($t['title']) ?></option><?php endforeach; ?></select></label>
  <label>Id <input name="id" required pattern="[a-z0-9]+(-[a-z0-9]+)*"></label>
  <label>Titolo <input name="title" required></label>
  <label>Posizione <input name="position" type="number" value="0" class="w-small"></label>
  <label>Peso <input name="exam_weight" type="number" step="0.1" value="1" class="w-small"></label>
  <label class="check"><input type="checkbox" name="is_free" value="1"> Gratuito</label>
  <button class="btn btn-sm">Salva</button></form></details>
<?php foreach ($topics as $t): ?>
  <h2 class="h3"><?= e($t['title']) ?> <span class="small muted"><?= e($t['id']) ?> · pos <?= (int) $t['position'] ?> · peso <?= e($t['exam_weight']) ?></span></h2>
  <ul class="list small"><?php foreach ($subs as $s) if ($s['topic_id'] === $t['id']): ?>
    <li><?= e($s['title']) ?> <span class="muted"><?= e($s['id']) ?><?= $s['is_free'] ? ' · gratis' : '' ?></span></li>
  <?php endif; ?></ul>
<?php endforeach; ?>
