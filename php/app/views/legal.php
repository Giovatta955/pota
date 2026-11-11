<?php $o = cfg('site.owner'); $n = cfg('site.name'); ?>
<a href="/" class="small muted">← Home</a>
<h1><?= e($title) ?></h1>
<p class="alert alert-warn small">BOZZA da far validare: testo di partenza, non è consulenza legale. Aggiornato al <?= e(cfg('site.updated')) ?>.</p>
<div class="prose">
<?php if ($page === 'privacy'): ?>
  <h2>Titolare del trattamento</h2>
  <p><?= e($o['name']) ?> — P.IVA <?= e($o['vat']) ?> — <?= e($o['address']) ?> — contatto privacy: <?= e($o['email']) ?>.</p>
  <h2>Dati che trattiamo</h2>
  <ul>
    <li>Email e password (conservata solo in forma cifrata con hash), per l'accesso.</li>
    <li>Dati di studio: risposte ai quiz, esiti degli esami, progressi delle flashcard, segnalazioni inviate.</li>
    <li>Dati di abbonamento (stato, scadenza, identificativi cliente). I dati della carta sono gestiti solo da Stripe e non transitano dai nostri server.</li>
  </ul>
  <h2>Finalità e basi giuridiche</h2>
  <ul>
    <li>Erogare il servizio e gestire l'account (esecuzione del contratto).</li>
    <li>Fatturazione e obblighi fiscali (obbligo di legge).</li>
    <li>Sicurezza e prevenzione abusi (legittimo interesse).</li>
  </ul>
  <h2>Fornitori</h2>
  <p>Fornitore di hosting e database (TODO_GIOVANNI: indicare quale), Stripe (pagamenti).</p>
  <h2>Conservazione</h2>
  <p>Finché l'account è attivo; alla cancellazione i dati personali vengono eliminati, salvo quelli da conservare per legge. TODO_GIOVANNI: indicare i termini.</p>
  <h2>I tuoi diritti</h2>
  <p>Puoi esportare i tuoi dati e cancellare l'account dall'area Account; per gli altri diritti scrivi a <?= e($o['email']) ?>.</p>
<?php elseif ($page === 'cookie'): ?>
  <p>Il sito usa solo un cookie <b>tecnico</b> di sessione, necessario per restare connesso. Non usiamo cookie di profilazione né strumenti di analisi, perciò non serve un banner di consenso.</p>
  <ul>
    <li>Podcast e video di terzi (YouTube in modalità privacy avanzata, Vimeo, Spotify) si caricano solo dopo che premi "Riproduci".</li>
    <li>Durante il pagamento Stripe può impostare propri cookie tecnici sul suo dominio.</li>
  </ul>
<?php elseif ($page === 'termini'): ?>
  <h2>Servizio</h2>
  <p><?= e($n) ?> offre materiali di studio digitali (riassunti, mappe, flashcard, quiz, simulazioni) per la preparazione a TFA e concorsi. Il servizio non garantisce l'esito di alcuna prova.</p>
  <h2>Contenuti</h2>
  <p>I contenuti sono originali e non ufficiali, per uso personale: è vietato copiarli, rivenderli o ridistribuirli. Possono contenere errori: segnalali con "Segnala errore".</p>
  <h2>Account e pagamenti</h2>
  <p>L'abbonamento mensile si rinnova automaticamente fino a disdetta, gestibile dall'area Account. Il pass è un pagamento unico con accesso fino alla data indicata. Prezzi IVA inclusa. TODO_GIOVANNI: confermare.</p>
  <h2>Recesso</h2>
  <p>Vedi <a href="/recesso">Diritto di recesso</a>.</p>
  <h2>Responsabilità</h2>
  <p>Servizio fornito "così com'è", nei limiti di legge. TODO_GIOVANNI: foro competente e legge applicabile.</p>
<?php elseif ($page === 'recesso'): ?>
  <p>Se acquisti come consumatore hai in generale 14 giorni per recedere. Per i <b>contenuti digitali</b> il recesso non si applica se l'esecuzione è iniziata con il tuo consenso espresso e la tua accettazione di perdere il diritto.</p>
  <p>Per questo, prima del pagamento ti chiediamo di confermarlo e registriamo la data del consenso.</p>
  <p>L'abbonamento mensile si può disdire in ogni momento dall'area Account, con effetto dal rinnovo successivo.</p>
<?php else: ?>
  <p><?= e($n) ?> è un servizio indipendente: <b>non è affiliato, sponsorizzato né approvato</b> dal MUR, dall'INDIRE o da alcuna università.</p>
  <p>I contenuti sono elaborati in modo originale e non riproducono materiali protetti.</p>
<?php endif; ?>
</div>
