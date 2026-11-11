<div class="narrow">
<h1>Crea un account</h1>
<p class="muted small">Gratis, senza carta: un argomento completo è subito disponibile.</p>
<?php if ($error): ?><p role="alert" class="alert alert-err"><?= e($error) ?></p><?php endif; ?>
<form method="post" action="/registrati" class="form">
  <?= csrf_field() ?>
  <label>Email <input type="email" name="email" value="<?= e($email) ?>" required autocomplete="email"></label>
  <label>Password (almeno 8 caratteri) <input type="password" name="password" minlength="8" required autocomplete="new-password"></label>
  <label>Ripeti la password <input type="password" name="password2" minlength="8" required autocomplete="new-password"></label>
  <label class="check"><input type="checkbox" name="termini" value="1" required> Accetto i <a href="/termini" target="_blank">termini di servizio</a> e ho letto l'<a href="/privacy" target="_blank">informativa privacy</a>.</label>
  <button class="btn btn-block">Crea account</button>
</form>
<p class="small">Hai già un account? <a href="/login">Accedi</a></p>
</div>
