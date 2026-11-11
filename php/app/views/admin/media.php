<?php require __DIR__ . '/nav.php'; ?>
<h1>Podcast e video</h1>
<form method="post" class="form card"><?= csrf_field() ?><input type="hidden" name="do" value="add">
  <label>Sottoargomento <select name="subtopic_id"><?php foreach ($subs as $s): ?><option value="<?= e($s['id']) ?>"><?= e($s['title']) ?></option><?php endforeach; ?></select></label>
  <label>Tipo <select name="kind"><option value="podcast">Podcast</option><option value="video">Video</option></select></label>
  <label>Titolo <input name="title" required maxlength="200"></label>
  <label>Link (YouTube, Vimeo, Spotify o file .mp3/.mp4 in https) <input name="url" type="url" required></label>
  <label>Descrizione <textarea name="description" rows="2" maxlength="1000"></textarea></label>
  <label>Durata (minuti) <input name="minutes" type="number" step="0.5" min="0" class="w-small"></label>
  <label>Posizione <input name="position" type="number" value="0" class="w-small"></label>
  <button class="btn btn-sm">Aggiungi</button>
</form>
<ul class="list small">
<?php foreach ($media as $m): ?>
  <li class="row-between"><span><?= $m['kind'] === 'podcast' ? '🎧' : '🎬' ?> <?= e($m['title']) ?> <span class="muted">— <?= e($m['sub_title']) ?></span></span>
  <form method="post"><?= csrf_field() ?><input type="hidden" name="do" value="delete"><input type="hidden" name="id" value="<?= (int) $m['id'] ?>"><button class="linkbtn">Elimina</button></form></li>
<?php endforeach; ?>
<?php if (!$media): ?><li class="muted">Nessun contenuto.</li><?php endif; ?>
</ul>
