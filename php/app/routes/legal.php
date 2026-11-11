<?php
$titles = ['privacy' => 'Informativa sulla privacy', 'cookie' => 'Cookie policy', 'termini' => 'Termini di servizio',
    'recesso' => 'Diritto di recesso per contenuti digitali', 'disclaimer' => 'Disclaimer e non affiliazione'];
$page = $params[0];
render('legal', ['title' => $titles[$page], 'page' => $page]);
