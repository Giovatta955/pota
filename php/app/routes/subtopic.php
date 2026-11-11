<?php
[$topicId, $subId] = $params;
$st = q_one('SELECT s.id, s.title, s.is_free, s.topic_id, t.title AS topic_title FROM subtopics s JOIN topics t ON t.id = s.topic_id WHERE s.id = ? AND s.topic_id = ?', [$subId, $topicId]);
if (!$st) not_found();
$user = current_user();
$allowed = can_read_subtopic($st, $user);
$tabs = ['riassunto' => 'Riassunto', 'mappa' => 'Mappa', 'flashcard' => 'Flashcard', 'quiz' => 'Quiz', 'media' => 'Podcast e video'];
$v = isset($tabs[$_GET['v'] ?? '']) ? $_GET['v'] : 'riassunto';
$data = [];

if ($allowed) {
    switch ($v) {
        case 'mappa':
            $data['tree'] = q_val('SELECT tree FROM maps WHERE subtopic_id = ?', [$subId]);
            break;
        case 'flashcard':
            $cards = q_all('SELECT id, front, back FROM flashcards WHERE subtopic_id = ? ORDER BY id', [$subId]);
            if ($user && $cards) {
                $due = [];
                foreach (q_all('SELECT flashcard_id, due_date FROM flashcard_progress WHERE user_id = ? AND flashcard_id IN (' . in_list($cards) . ')',
                    array_merge([$user['id']], array_column($cards, 'id'))) as $p) $due[$p['flashcard_id']] = $p['due_date'];
                $cards = array_values(array_filter($cards, fn($c) => !isset($due[$c['id']]) || $due[$c['id']] <= today()));
            }
            $data['cards'] = $cards;
            break;
        case 'quiz':
            $lv = (int) ($_GET['l'] ?? 0);
            if ($lv >= 1 && $lv <= 5) {
                $qs = q_all("SELECT id, level, stem, options FROM questions WHERE subtopic_id = ? AND level = ? AND status = 'published' AND active = 1", [$subId, $lv]);
                $data['questions'] = array_slice(shuffle_copy($qs), 0, 10);
            }
            $data['level'] = $lv;
            break;
        case 'media':
            $data['media'] = q_all('SELECT id, kind, title, url, description, duration_s FROM media WHERE subtopic_id = ? ORDER BY position, created_at', [$subId]);
            break;
        default:
            $data['summary'] = q_one('SELECT html, key_points FROM summaries WHERE subtopic_id = ?', [$subId]);
    }
}
render('subtopic', ['title' => $st['title'], 'st' => $st, 'tabs' => $tabs, 'v' => $v, 'allowed' => $allowed] + $data);
