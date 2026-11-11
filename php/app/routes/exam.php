<?php
$u = require_login();
$uid = (int) $u['id'];
$examId = $params[0] ?? null;

if (!$examId) {
    $paid = has_paid_access($u);
    if ($method === 'POST') {
        if (!$paid) redirect('/account');
        $count = (int) ($_POST['count'] ?? 30);
        $topics = q_all('SELECT id, exam_weight FROM topics ORDER BY position');
        $pool = q_all("SELECT id, topic_id, level FROM questions WHERE status = 'published' AND active = 1");
        $ids = compose_exam($count, $topics, $pool, (array) cfg('exam.level_mix'));
        if (!$ids) redirect('/esame?errore=vuoto');
        $id = bin2hex(random_bytes(16));
        q('INSERT INTO exams (id, user_id, question_ids, duration_s) VALUES (?, ?, ?, ?)',
            [$id, $uid, json_encode($ids), count($ids) * (int) cfg('exam.seconds_per_question', 90)]);
        redirect('/esame/' . $id);
    }
    $history = q_all('SELECT id, started_at, submitted_at, score FROM exams WHERE user_id = ? ORDER BY started_at DESC LIMIT 10', [$uid]);
    render('exam_home', ['title' => 'Esame simulato', 'paid' => $paid, 'error' => isset($_GET['errore']), 'history' => $history]);
    exit;
}

$exam = q_one('SELECT * FROM exams WHERE id = ? AND user_id = ?', [$examId, $uid]);
if (!$exam) not_found();
$ids = json_decode($exam['question_ids'], true) ?: [];

if (!$exam['submitted_at']) {
    $byId = array_column(q_all('SELECT id, level, stem, options FROM questions WHERE id IN (' . in_list($ids) . ')', $ids), null, 'id');
    $questions = [];
    foreach ($ids as $id) if (isset($byId[$id])) $questions[] = $byId[$id];
    $left = max(0, (int) $exam['duration_s'] - (time() - strtotime($exam['started_at'])));
    render('exam_run', ['title' => 'Esame simulato', 'examId' => $examId, 'questions' => $questions, 'left' => $left]);
    exit;
}

$qs = q_all('SELECT id, topic_id, correct, stem, options, explanation FROM questions WHERE id IN (' . in_list($ids) . ')', $ids);
$answers = array_column(q_all('SELECT question_id, answer FROM exam_answers WHERE exam_id = ?', [$examId]), 'answer', 'question_id');
$g = grade_exam($qs, $answers);
$titles = array_column(q_all('SELECT id, title FROM topics'), 'title', 'id');
$wrongList = array_values(array_filter($qs, fn($q) => ($answers[$q['id']] ?? null) !== $q['correct']));
render('exam_result', ['title' => 'Risultato esame', 'g' => $g, 'titles' => $titles, 'wrongList' => $wrongList, 'answers' => $answers]);
