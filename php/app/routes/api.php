<?php
// Endpoint usati da assets/app.js (fetch con FormData + token CSRF).
if ($method !== 'POST') json_out(['ok' => false], 405);
$u = current_user();
if (!$u) json_out(['ok' => false, 'error' => 'login'], 401);
$uid = (int) $u['id'];
$action = $params[0];

if ($action === 'risposta') {
    // Corregge sul server: la risposta giusta non arriva al browser prima che l'utente risponda.
    $qid = (string) ($_POST['question_id'] ?? '');
    $ans = (string) ($_POST['answer'] ?? '');
    $mode = ($_POST['mode'] ?? '') === 'trainer' ? 'trainer' : 'quiz';
    $timeMs = max(0, min(3600000, (int) ($_POST['time_ms'] ?? 0)));
    if (!in_array($ans, ['A', 'B', 'C', 'D'], true)) json_out(['ok' => false], 400);
    $q = q_one("SELECT id, topic_id, subtopic_id, level, correct, explanation, reference FROM questions WHERE id = ? AND status = 'published' AND active = 1", [$qid]);
    if (!$q || !can_read_subtopic_id($q['subtopic_id'], $u)) json_out(['ok' => false, 'error' => 'accesso'], 403);
    $correct = $q['correct'] === $ans;
    q('INSERT INTO attempts (user_id, question_id, answer, is_correct, time_ms, mode) VALUES (?, ?, ?, ?, ?, ?)', [$uid, $q['id'], $ans, (int) $correct, $timeMs, $mode]);

    $st = q_one('SELECT accuracy_ema, current_level, n_answers FROM topic_stats WHERE user_id = ? AND topic_id = ?', [$uid, $q['topic_id']])
        ?? ['accuracy_ema' => 0.5, 'current_level' => 1, 'n_answers' => 0];
    $recent = array_reverse(array_map(fn($r) => (bool) $r['is_correct'], q_all(
        'SELECT a.is_correct FROM attempts a JOIN questions qq ON qq.id = a.question_id
         WHERE a.user_id = ? AND qq.topic_id = ? AND qq.level = ? ORDER BY a.id DESC LIMIT 10',
        [$uid, $q['topic_id'], $st['current_level']]
    )));
    q('INSERT INTO topic_stats (user_id, topic_id, accuracy_ema, current_level, n_answers) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE accuracy_ema = VALUES(accuracy_ema), current_level = VALUES(current_level), n_answers = VALUES(n_answers)',
        [$uid, $q['topic_id'], round(update_ema((float) $st['accuracy_ema'], $correct), 4), next_level((int) $st['current_level'], $recent), (int) $st['n_answers'] + 1]);

    // Pulizia leggera: tiene al massimo 3000 risposte per utente.
    if (random_int(1, 50) === 1) {
        $cut = q_val('SELECT id FROM attempts WHERE user_id = ? ORDER BY id DESC LIMIT 1 OFFSET 3000', [$uid]);
        if ($cut) q('DELETE FROM attempts WHERE user_id = ? AND id <= ?', [$uid, $cut]);
    }
    json_out(['ok' => true, 'correct' => $correct, 'correctKey' => $q['correct'], 'explanation' => $q['explanation'], 'reference' => $q['reference']]);
}

if ($action === 'flashcard') {
    $cid = (string) ($_POST['card_id'] ?? '');
    $known = ($_POST['known'] ?? '') === '1';
    $sub = q_val('SELECT subtopic_id FROM flashcards WHERE id = ?', [$cid]);
    if (!$sub || !can_read_subtopic_id((string) $sub, $u)) json_out(['ok' => false], 403);
    $prev = q_one('SELECT ease, interval_days, repetitions, due_date FROM flashcard_progress WHERE user_id = ? AND flashcard_id = ?', [$uid, $cid])
        ?? ['ease' => 2.5, 'interval_days' => 0, 'repetitions' => 0, 'due_date' => today()];
    $n = sm2_review($prev, $known ? 4 : 1, today());
    q('INSERT INTO flashcard_progress (user_id, flashcard_id, ease, interval_days, repetitions, due_date) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE ease = VALUES(ease), interval_days = VALUES(interval_days), repetitions = VALUES(repetitions), due_date = VALUES(due_date)',
        [$uid, $cid, $n['ease'], $n['interval_days'], $n['repetitions'], $n['due_date']]);
    json_out(['ok' => true, 'due' => $n['due_date']]);
}

if ($action === 'segnala') {
    $qid = (string) ($_POST['question_id'] ?? '');
    $note = trim((string) ($_POST['note'] ?? ''));
    if ($note === '' || mb_strlen($note) > 2000 || !q_val('SELECT 1 FROM questions WHERE id = ?', [$qid])) json_out(['ok' => false], 400);
    q('INSERT INTO reports (question_id, user_id, note) VALUES (?, ?, ?)', [$qid, $uid, $note]);
    json_out(['ok' => true]);
}

if ($action === 'esame-consegna') {
    $examId = (string) ($_POST['exam_id'] ?? '');
    $exam = q_one('SELECT id, question_ids, submitted_at FROM exams WHERE id = ? AND user_id = ?', [$examId, $uid]);
    if (!$exam || $exam['submitted_at']) json_out(['ok' => false], 400);
    $ids = json_decode($exam['question_ids'], true) ?: [];
    $raw = json_decode((string) ($_POST['answers'] ?? '{}'), true) ?: [];
    $answers = [];
    foreach ($ids as $id) $answers[$id] = in_array($raw[$id] ?? null, ['A', 'B', 'C', 'D'], true) ? $raw[$id] : null;
    $qs = q_all('SELECT id, topic_id, correct FROM questions WHERE id IN (' . in_list($ids) . ')', $ids);
    $g = grade_exam($qs, $answers);
    db()->beginTransaction();
    foreach ($ids as $id) q('INSERT INTO exam_answers (exam_id, question_id, answer) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE answer = VALUES(answer)', [$examId, $id, $answers[$id]]);
    foreach ($qs as $qq) if ($answers[$qq['id']]) q("INSERT INTO attempts (user_id, question_id, answer, is_correct, mode) VALUES (?, ?, ?, ?, 'exam')", [$uid, $qq['id'], $answers[$qq['id']], (int) ($answers[$qq['id']] === $qq['correct'])]);
    q('UPDATE exams SET submitted_at = NOW(), score = ? WHERE id = ?', [round($g['score'], 4), $examId]);
    db()->commit();
    json_out(['ok' => true]);
}
json_out(['ok' => false], 404);
