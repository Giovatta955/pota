<div class="narrow">
<h1>Nuova password</h1>
<?php if (!$valid): ?>
  <p class="alert alert-err">Il link non è valido o è scaduto. <a href="/password-dimenticata">Richiedine uno nuovo</a>.</p>
<?php else: ?>
  <?php if ($error): ?><p role="alert" class="alert alert-err"><?= e($error) ?></p><?php endif; ?>
  <form method="post" action="/reimposta-password" class="form">
    <?= csrf_field() ?>
    <input type="hidden" name="t" value="<?= e($token) ?>">
    <label>Nuova password <input type="password" name="password" minlength="8" required autocomplete="new-password"></label>
    <label>Ripeti la password <input type="password" name="password2" minlength="8" required autocomplete="new-password"></label>
    <button class="btn btn-block">Salva</button>
  </form>
<?php endif; ?>
</div>
