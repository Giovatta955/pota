<h1>Esame simulato</h1>
<p class="muted small">Domande miste di tutti gli argomenti, con timer. Nessuna correzione fino alla consegna.</p>
<?php if ($error): ?><p class="alert alert-err">Non ci sono ancora domande disponibili.</p><?php endif; ?>
<?php if ($paid): ?>
<form method="post" action="/esame" class="form">
  <?= csrf_field() ?>
  <label>Numero di domande <input type="number" name="count" min="<?= (int) cfg('exam.min') ?>" max="<?= (int) cfg('exam.max') ?>" value="<?= (int) cfg('exam.min') ?>" class="w-small"></label>
  <button class="btn">Inizia</button>
</form>
<?php else: ?>
<p class="alert alert-info">L'esame simulato è incluso nei piani a pagamento. <a href="/account"><b>Scegli un piano</b></a></p>
<?php endif; ?>
<?php if ($history): ?>
<h2 class="h3">I tuoi ultimi esami</h2>
<ul class="list small">
<?php foreach ($history as $h): ?>
  <li><a class="row-between" href="/esame/<?= e($h['id']) ?>"><span><?= e(date('d/m/Y H:i', strtotime($h['started_at']))) ?></span>
  <span><?= $h['submitted_at'] ? (int) round($h['score'] * 100) . '%' : 'in corso' ?></span></a></li>
<?php endforeach; ?>
</ul>
<?php endif; ?>
