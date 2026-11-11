<div class="narrow">
<h1>Password dimenticata</h1>
<?php if ($sent): ?>
  <p class="alert alert-ok">Se l'indirizzo è registrato, riceverai un'email con il link per scegliere una nuova password (valido 1 ora). Controlla anche lo spam.</p>
<?php else: ?>
<form method="post" action="/password-dimenticata" class="form">
  <?= csrf_field() ?>
  <label>Email <input type="email" name="email" required autocomplete="email"></label>
  <button class="btn btn-block">Inviami il link</button>
</form>
<?php endif; ?>
<p class="small"><a href="/login">Torna all'accesso</a></p>
</div>
