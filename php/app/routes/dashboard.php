<?php
$u = require_login();
$topics = q_all('SELECT id, title FROM topics ORDER BY position, title');
$due = (int) q_val('SELECT COUNT(*) FROM flashcard_progress WHERE user_id = ? AND due_date <= ?', [$u['id'], today()]);
$weak = q_all('SELECT s.topic_id, s.accuracy_ema, t.title FROM topic_stats s JOIN topics t ON t.id = s.topic_id
               WHERE s.user_id = ? AND s.n_answers > 0 ORDER BY s.accuracy_ema LIMIT 3', [$u['id']]);
render('dashboard', ['title' => 'Dashboard', 'topics' => $topics, 'due' => $due, 'weak' => $weak, 'paid' => has_paid_access($u)]);
