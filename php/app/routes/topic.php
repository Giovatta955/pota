<?php
$t = q_one('SELECT id, title FROM topics WHERE id = ?', [$params[0]]);
if (!$t) not_found();
$subs = q_all('SELECT id, title, is_free FROM subtopics WHERE topic_id = ? ORDER BY position, title', [$t['id']]);
render('topic', ['title' => $t['title'], 'topic' => $t, 'subs' => $subs]);
