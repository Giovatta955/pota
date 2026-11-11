<?php
$topics = q_all('SELECT id, title FROM topics ORDER BY position, title');
render('home', ['title' => cfg('site.name'), 'topics' => $topics]);
