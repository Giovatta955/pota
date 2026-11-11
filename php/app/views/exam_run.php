<?php $payload = array_map(fn($q) => ['id' => $q['id'], 'stem' => $q['stem'], 'options' => json_decode($q['options'], true)], $questions); ?>
<div class="js-exam" data-id="<?= e($examId) ?>" data-left="<?= (int) $left ?>">
  <script type="application/json"><?= json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
  <noscript>Per svolgere l'esame attiva JavaScript.</noscript>
</div>
