<div class="narrow">
<h1>Accedi</h1>
<?php if ($error): ?><p role="alert" class="alert alert-err"><?= e($error) ?></p><?php endif; ?>
<form method="post" action="/login" class="form">
  <?= csrf_field() ?>
  <input type="hidden" name="next" value="<?= e($next) ?>">
  <label>Email <input type="email" name="email" value="<?= e($email) ?>" required autocomplete="email"></label>
  <label>Password <input type="password" name="password" required autocomplete="current-password"></label>
  <button class="btn btn-block">Accedi</button>
</form>
<p class="small"><a href="/password-dimenticata">Password dimenticata?</a></p>
<p class="small">Non hai un account? <a href="/registrati">Registrati gratis</a></p>
</div>
