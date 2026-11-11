<?php
$features = [
  ['Riassunti chiari', 'Ogni argomento in pochi minuti, con tabelle, esempi e punti chiave.'],
  ['Mappe concettuali', 'Rami colorati e frasi di collegamento, da aprire e chiudere.'],
  ['Flashcard intelligenti', 'Ripetizione spaziata: ripassi quando serve.'],
  ['Quiz a 5 livelli', 'Dalle definizioni ai casi più insidiosi.'],
  ['Allenatore', 'Trova le tue fragilità e ti propone il ripasso mirato.'],
  ['Esame simulato', '30–50 domande con timer e report finale.'],
];
$faq = [
  ['I contenuti sono ufficiali?', 'No. Sono materiali originali, rielaborati con parole nostre. Il sito non è affiliato a MUR, INDIRE o università.'],
  ['Cosa è gratis?', 'Un argomento completo: riassunto, mappa, flashcard e quiz. Il resto richiede un piano.'],
  ['Posso disdire quando voglio?', 'Sì, l\'abbonamento si gestisce da solo dall\'area Account.'],
  ['Che differenza c\'è tra mensile e pass?', 'Il mensile si rinnova ogni mese; il pass si paga una volta e vale fino alla data del concorso.'],
  ['Posso studiare dal telefono?', 'Sì, il sito è pensato prima di tutto per lo smartphone.'],
];
?>
<?php if (isset($_GET['eliminato'])): ?><p class="alert alert-ok">Account eliminato. Ci dispiace vederti andare.</p><?php endif; ?>
<section class="hero">
  <h1>Prepara il TFA sostegno, <span class="accent">un quiz alla volta</span></h1>
  <p class="muted"><?= e(cfg('site.description')) ?></p>
  <a href="/registrati" class="btn btn-lg">Inizia gratis</a>
  <p class="small muted">Un argomento completo gratuito, senza carta.</p>
</section>
<section>
  <h2>Tutto quello che serve</h2>
  <ul class="grid2">
    <?php foreach ($features as [$t, $d]): ?><li class="card"><h3><?= e($t) ?></h3><p class="muted small"><?= e($d) ?></p></li><?php endforeach; ?>
  </ul>
</section>
<?php if ($topics): ?>
<section>
  <h2>Argomenti</h2>
  <ul class="list">
    <?php foreach ($topics as $t): ?><li><a href="/argomenti/<?= e($t['id']) ?>"><?= e($t['title']) ?></a></li><?php endforeach; ?>
  </ul>
</section>
<?php endif; ?>
<section>
  <h2>Prezzi</h2>
  <div class="grid2">
    <div class="card"><h3>Mensile</h3><p class="price"><?= price_eur((float) cfg('prices.monthly_eur')) ?><span class="small muted"> /mese</span></p><p class="small muted">Tutti gli argomenti, annulli quando vuoi.</p></div>
    <div class="card card-accent"><h3>Pass fino al concorso</h3><p class="price"><?= price_eur((float) cfg('prices.pass_eur')) ?><span class="small muted"> una tantum</span></p><p class="small muted">Accesso completo fino alla data della prova.</p></div>
  </div>
  <p class="small muted">Prezzi IVA inclusa.</p>
</section>
<section>
  <h2>Domande frequenti</h2>
  <?php foreach ($faq as [$qq, $a]): ?><details class="card"><summary><?= e($qq) ?></summary><p class="small muted"><?= e($a) ?></p></details><?php endforeach; ?>
</section>
