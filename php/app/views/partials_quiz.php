<?php
// Componente quiz: i dati partono senza la risposta corretta (la correzione avviene sul server).
$payload = array_map(fn($q) => ['id' => $q['id'], 'level' => (int) $q['level'], 'stem' => $q['stem'], 'options' => json_decode($q['options'], true)], $questions);
?>
<?php if (!$payload): ?>
  <p class="muted small">Nessuna domanda disponibile per questa scelta.</p>
<?php else: ?>
  <div class="js-quiz" data-mode="<?= e($mode ?? 'quiz') ?>">
    <script type="application/json"><?= json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
    <noscript>Per svolgere i quiz attiva JavaScript.</noscript>
  </div>
<?php endif; ?>
