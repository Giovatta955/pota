<h1>Account</h1>
<p class="muted small"><?= e($user['email']) ?></p>
<?php if ($ok): ?><p class="alert alert-ok">Pagamento ricevuto. L'accesso si attiva in pochi secondi: aggiorna la pagina.</p><?php endif; ?>
<?php if ($error): ?><p role="alert" class="alert alert-err"><?= e($error) ?></p><?php endif; ?>
<p>Piano: <b><?= $paid ? 'Premium' : 'Gratuito' ?></b>
<?php foreach ($subs as $s): if (in_array($s['status'], ['active', 'trialing'], true)): ?>
  <span class="small muted">(<?= $s['plan'] === 'pass' ? 'pass' : 'mensile' ?><?= $s['current_period_end'] ? ', fino al ' . e(date('d/m/Y', strtotime($s['current_period_end']))) : '' ?>)</span>
<?php break; endif; endforeach; ?></p>

<?php if (!$paid): ?>
<form method="post" action="/account/checkout" class="form">
  <?= csrf_field() ?>
  <fieldset class="stack">
    <legend><b>Scegli un piano</b></legend>
    <label class="card check"><input type="radio" name="plan" value="monthly" checked> Abbonamento mensile — <?= price_eur((float) cfg('prices.monthly_eur')) ?>/mese</label>
    <label class="card check"><input type="radio" name="plan" value="pass"> Pass fino al concorso — <?= price_eur((float) cfg('prices.pass_eur')) ?> una tantum</label>
  </fieldset>
  <label class="check small"><input type="checkbox" name="consenso" value="1" required> Chiedo l'accesso immediato ai contenuti digitali e riconosco che, a fornitura iniziata, perdo il diritto di recesso.</label>
  <button class="btn btn-block">Procedi al pagamento</button>
</form>
<?php endif; ?>

<?php if ($hasCustomer): ?>
<form method="post" action="/account/portale"><?= csrf_field() ?><button class="btn btn-ghost">Gestisci abbonamento e fatture</button></form>
<?php endif; ?>

<section class="danger-zone">
  <h2 class="h3">I tuoi dati</h2>
  <p><a class="btn btn-ghost btn-sm" href="/account/esporta">Scarica i miei dati (JSON)</a></p>
  <form method="post" action="/account/elimina" class="form">
    <?= csrf_field() ?>
    <label class="small">Elimina definitivamente l'account e i dati: scrivi <b>ELIMINA</b> per confermare.
      <input name="conferma" autocomplete="off" class="w-small"></label>
    <button class="btn btn-danger btn-sm">Elimina account</button>
  </form>
</section>
<form method="post" action="/esci"><?= csrf_field() ?><button class="linkbtn small">Esci</button></form>
