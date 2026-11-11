<?php require __DIR__ . '/nav.php'; ?>
<h1>Numeri</h1>
<ul class="list"><?php foreach ($stats as $k => $v): ?><li class="row-between"><span><?= e($k) ?></span><b><?= e($v) ?></b></li><?php endforeach; ?></ul>
