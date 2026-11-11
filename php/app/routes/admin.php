<?php
require_admin();
$sub = $params[1] ?? '';
$slug = fn($s) => is_string($s) && preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $s) && strlen($s) <= 80;

if ($sub === '') {
    if ($method === 'POST') {
        if (($_POST['do'] ?? '') === 'report') {
            $st = in_array($_POST['status'] ?? '', ['resolved', 'dismissed'], true) ? $_POST['status'] : 'resolved';
            q('UPDATE reports SET status = ? WHERE id = ?', [$st, (int) $_POST['id']]);
        } elseif (($_POST['do'] ?? '') === 'question') {
            $stem = trim((string) $_POST['stem']);
            $expl = trim((string) $_POST['explanation']);
            if (mb_strlen($stem) >= 10 && mb_strlen($expl) >= 20)
                q('UPDATE questions SET stem = ?, explanation = ?, active = ? WHERE id = ?', [$stem, $expl, empty($_POST['active']) ? 0 : 1, (string) $_POST['id']]);
            flash('Domanda salvata.');
        }
        redirect('/admin');
    }
    $reports = q_all("SELECT r.id, r.note, r.created_at, r.question_id, q.level, q.stem, q.options, q.correct, q.explanation, q.active
                      FROM reports r JOIN questions q ON q.id = r.question_id WHERE r.status = 'open' ORDER BY r.created_at");
    render('admin/reports', ['title' => 'Admin · segnalazioni', 'reports' => $reports]);
    exit;
}

if ($sub === 'argomenti') {
    if ($method === 'POST') {
        $id = $_POST['id'] ?? '';
        $title = trim((string) ($_POST['title'] ?? ''));
        $pos = (int) ($_POST['position'] ?? 0);
        $w = max(0, min(100, (float) ($_POST['exam_weight'] ?? 1)));
        if ($slug($id) && $title !== '') {
            if (($_POST['do'] ?? '') === 'topic') {
                q('INSERT INTO topics (id, title, position, exam_weight) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), position = VALUES(position), exam_weight = VALUES(exam_weight)', [$id, $title, $pos, $w]);
            } elseif (($_POST['do'] ?? '') === 'subtopic' && $slug($_POST['topic_id'] ?? '')) {
                q('INSERT INTO subtopics (id, topic_id, title, position, exam_weight, is_free) VALUES (?, ?, ?, ?, ?, ?)
                   ON DUPLICATE KEY UPDATE title = VALUES(title), position = VALUES(position), exam_weight = VALUES(exam_weight), is_free = VALUES(is_free)',
                    [$id, $_POST['topic_id'], $title, $pos, $w, empty($_POST['is_free']) ? 0 : 1]);
            }
            flash('Salvato.');
        } else flash('Dati non validi: id solo minuscole, numeri e trattini.', 'err');
        redirect('/admin/argomenti');
    }
    $topics = q_all('SELECT * FROM topics ORDER BY position, title');
    $subs = q_all('SELECT * FROM subtopics ORDER BY topic_id, position, title');
    render('admin/topics', ['title' => 'Admin · argomenti', 'topics' => $topics, 'subs' => $subs]);
    exit;
}

if ($sub === 'media') {
    if ($method === 'POST') {
        if (($_POST['do'] ?? '') === 'delete') {
            q('DELETE FROM media WHERE id = ?', [(int) $_POST['id']]);
        } else {
            $urlIn = trim((string) ($_POST['url'] ?? ''));
            $title = trim((string) ($_POST['title'] ?? ''));
            $kind = ($_POST['kind'] ?? '') === 'video' ? 'video' : 'podcast';
            $subId = (string) ($_POST['subtopic_id'] ?? '');
            if (!parse_media_url($urlIn)) flash('Link non supportato: usa YouTube, Vimeo, Spotify o un file .mp3/.mp4 in https.', 'err');
            elseif ($title === '' || !q_val('SELECT 1 FROM subtopics WHERE id = ?', [$subId])) flash('Titolo o sottoargomento mancanti.', 'err');
            else {
                $min = (float) ($_POST['minutes'] ?? 0);
                q('INSERT INTO media (subtopic_id, kind, title, url, description, duration_s, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [$subId, $kind, mb_substr($title, 0, 200), $urlIn, mb_substr(trim((string) ($_POST['description'] ?? '')), 0, 1000) ?: null, $min > 0 ? (int) round($min * 60) : null, (int) ($_POST['position'] ?? 0)]);
                flash('Contenuto aggiunto.');
            }
        }
        redirect('/admin/media');
    }
    $media = q_all('SELECT m.*, s.title AS sub_title FROM media m JOIN subtopics s ON s.id = m.subtopic_id ORDER BY s.topic_id, m.subtopic_id, m.position');
    $subs = q_all('SELECT id, title FROM subtopics ORDER BY topic_id, position');
    render('admin/media', ['title' => 'Admin · media', 'media' => $media, 'subs' => $subs]);
    exit;
}

if ($sub === 'spazio') {
    $stats = [
        'Utenti' => q_val('SELECT COUNT(*) FROM users'),
        'Abbonamenti attivi' => q_val("SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > NOW())"),
        'Domande' => q_val('SELECT COUNT(*) FROM questions'),
        'Flashcard' => q_val('SELECT COUNT(*) FROM flashcards'),
        'Risposte registrate' => q_val('SELECT COUNT(*) FROM attempts'),
        'Esami svolti' => q_val('SELECT COUNT(*) FROM exams WHERE submitted_at IS NOT NULL'),
        'Spazio database (MB)' => round((float) q_val('SELECT SUM(data_length + index_length) FROM information_schema.tables WHERE table_schema = DATABASE()') / 1048576, 1),
    ];
    render('admin/stats', ['title' => 'Admin · numeri', 'stats' => $stats]);
    exit;
}
not_found();
