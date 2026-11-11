<?php
$u = require_login();
$uid = (int) $u['id'];
$paid = has_paid_access($u);
$readable = $paid ? '' : ' AND s.is_free = 1'; // senza piano l'allenatore usa solo i contenuti gratuiti

if (empty($params[0])) {
    $stats = q_all('SELECT topic_id, accuracy_ema, current_level, n_answers FROM topic_stats WHERE user_id = ?', [$uid]);
    $titles = array_column(q_all('SELECT id, title FROM topics'), 'title', 'id');
    render('trainer', ['title' => 'Le tue fragilità', 'ranked' => rank_weak_topics($stats), 'titles' => $titles, 'paid' => $paid]);
    exit;
}

$topic = isset($_GET['topic']) && preg_match('/^[a-z0-9-]+$/', $_GET['topic']) ? $_GET['topic'] : null;
$sql = "SELECT q.id, q.topic_id, q.level FROM questions q JOIN subtopics s ON s.id = q.subtopic_id WHERE q.status = 'published' AND q.active = 1" . $readable;
$args = [];
if ($topic) {
    $sql .= ' AND q.topic_id = ?';
    $args[] = $topic;
}
$pool = q_all($sql, $args);
$stats = q_all('SELECT topic_id, accuracy_ema, current_level, n_answers FROM topic_stats WHERE user_id = ?' . ($topic ? ' AND topic_id = ?' : ''), $topic ? [$uid, $topic] : [$uid]);
$seen = [];
$wrong = [];
foreach (q_all('SELECT question_id, is_correct FROM attempts WHERE user_id = ? ORDER BY id DESC LIMIT 2000', [$uid]) as $a) {
    if (isset($seen[$a['question_id']])) continue;
    $seen[$a['question_id']] = true;
    if (!$a['is_correct']) $wrong[$a['question_id']] = true; // sbagliata = ultimo tentativo errato
}
$ids = compose_trainer_session(10, $stats, $pool, $seen, $wrong);
$questions = [];
if ($ids) {
    $byId = array_column(q_all('SELECT id, level, stem, options FROM questions WHERE id IN (' . in_list($ids) . ')', $ids), null, 'id');
    foreach ($ids as $id) if (isset($byId[$id])) $questions[] = $byId[$id];
}
render('trainer_session', ['title' => 'Sessione allenatore', 'questions' => $questions]);
