<?php
declare(strict_types=1);
// Logica pura: flashcard (SM-2), allenatore, esame simulato. Stessi algoritmi della versione Next.js.

// ---------- Utilità ----------
function shuffle_copy(array $a): array
{
    $a = array_values($a);
    for ($i = count($a) - 1; $i > 0; $i--) {
        $j = random_int(0, $i);
        [$a[$i], $a[$j]] = [$a[$j], $a[$i]];
    }
    return $a;
}

/** Ripartisce $total in parti proporzionali ai pesi (resto più grande). La somma è sempre $total. */
function apportion(int $total, array $weights): array
{
    $n = count($weights);
    if ($total <= 0 || $n === 0) return array_fill(0, $n, 0);
    $sum = array_sum($weights);
    if ($sum <= 0) return apportion($total, array_fill(0, $n, 1));
    $raw = array_map(fn($w) => $w / $sum * $total, array_values($weights));
    $out = array_map(fn($r) => (int) floor($r), $raw);
    $left = $total - array_sum($out);
    $order = [];
    foreach ($raw as $i => $r) $order[] = ['i' => $i, 'f' => $r - floor($r)];
    usort($order, fn($a, $b) => $b['f'] <=> $a['f'] ?: $a['i'] <=> $b['i']);
    foreach ($order as $o) {
        if ($left <= 0) break;
        $out[$o['i']]++;
        $left--;
    }
    return $out;
}

// ---------- Flashcard: SM-2 ----------
function add_days(string $isoDate, int $days): string
{
    return (new DateTimeImmutable($isoDate))->modify(($days >= 0 ? '+' : '') . $days . ' days')->format('Y-m-d');
}

/** $state = [ease, interval_days, repetitions, due_date]; quality 0-5 ("So" = 4, "Non so" = 1). */
function sm2_review(array $state, int $quality, string $today): array
{
    $ease = (float) $state['ease'];
    $interval = (int) $state['interval_days'];
    $reps = (int) $state['repetitions'];
    if ($quality < 3) {
        $reps = 0;
        $interval = 1;
    } else {
        $reps++;
        $interval = $reps === 1 ? 1 : ($reps === 2 ? 6 : (int) round($interval * $ease));
    }
    $ease = max(1.3, $ease + 0.1 - (5 - $quality) * (0.08 + (5 - $quality) * 0.02));
    return ['ease' => round($ease, 2), 'interval_days' => $interval, 'repetitions' => $reps, 'due_date' => add_days($today, $interval)];
}

// ---------- Allenatore ----------
const EMA_ALPHA = 0.2;
const LEVEL_WINDOW = 10;
const LEVEL_UP_AT = 0.8;
const LEVEL_DOWN_BELOW = 0.5;

function update_ema(float $prev, bool $correct): float { return EMA_ALPHA * ($correct ? 1 : 0) + (1 - EMA_ALPHA) * $prev; }

/** $recent = esiti (bool) al livello corrente, dal più vecchio al più recente. */
function next_level(int $current, array $recent): int
{
    $last = array_slice($recent, -LEVEL_WINDOW);
    $n = count($last);
    $acc = $n ? count(array_filter($last)) / $n : 0;
    if ($n >= LEVEL_WINDOW) {
        if ($acc >= LEVEL_UP_AT) return min(5, $current + 1);
        if ($acc < LEVEL_DOWN_BELOW) return max(1, $current - 1);
    } elseif ($n >= 5 && $acc < LEVEL_DOWN_BELOW) {
        return max(1, $current - 1);
    }
    return $current;
}

/** Argomenti dal più debole (solo quelli già tentati). $stats: [topic_id, accuracy_ema, current_level, n_answers]. */
function rank_weak_topics(array $stats): array
{
    $out = [];
    foreach ($stats as $s) {
        if ((int) $s['n_answers'] <= 0) continue;
        $s['weakness'] = 1 - (float) $s['accuracy_ema'];
        $out[] = $s;
    }
    usort($out, fn($a, $b) => $b['weakness'] <=> $a['weakness'] ?: (int) $b['n_answers'] <=> (int) $a['n_answers']);
    return $out;
}

/**
 * Sessione dell'allenatore: ~60% argomenti deboli (prima le già sbagliate), ~10% mai viste, ~30% miste.
 * $pool: [id, topic_id, level]; $seen/$wrong: set (id => true).
 */
function compose_trainer_session(int $size, array $stats, array $pool, array $seen, array $wrong): array
{
    $levelOf = [];
    foreach ($stats as $s) $levelOf[$s['topic_id']] = (int) $s['current_level'];
    $chosen = [];
    $taken = [];
    $take = function ($q) use (&$chosen, &$taken, $size): bool {
        if ($q && !isset($taken[$q['id']]) && count($chosen) < $size) {
            $taken[$q['id']] = true;
            $chosen[] = $q['id'];
            return true;
        }
        return false;
    };
    $nWeak = (int) round($size * 0.6);
    $nFresh = (int) round($size * 0.1);

    $weak = array_slice(rank_weak_topics($stats), 0, 3);
    $quotas = apportion($nWeak, array_map(fn($w) => $w['weakness'] + 0.01, $weak));
    $cands = [];
    foreach ($weak as $w) {
        $lv = $levelOf[$w['topic_id']] ?? 1;
        $mine = shuffle_copy(array_filter($pool, fn($q) => $q['topic_id'] === $w['topic_id'] && abs((int) $q['level'] - $lv) <= 1));
        $rank = fn($q) => (isset($wrong[$q['id']]) ? 0 : 1) * 10 + abs((int) $q['level'] - $lv);
        usort($mine, fn($a, $b) => $rank($a) <=> $rank($b));
        $cands[] = $mine;
    }
    foreach ($cands as $i => &$list) {
        $n = 0;
        while ($n < $quotas[$i] && $list) if ($take(array_shift($list))) $n++;
    }
    unset($list);
    foreach ($cands as &$list) while (count($chosen) < $nWeak && $list) $take(array_shift($list));
    unset($list);

    $f = 0;
    foreach (shuffle_copy(array_filter($pool, fn($q) => !isset($seen[$q['id']]))) as $q) {
        if ($f >= $nFresh) break;
        if ($take($q)) $f++;
    }
    $nMixed = $size - $nWeak - $nFresh;
    $m = 0;
    foreach (shuffle_copy(array_filter($pool, fn($q) => abs((int) $q['level'] - ($levelOf[$q['topic_id']] ?? 1)) <= 1)) as $q) {
        if ($m >= $nMixed) break;
        if ($take($q)) $m++;
    }
    foreach (shuffle_copy($pool) as $q) {
        if (count($chosen) >= $size) break;
        $take($q);
    }
    return shuffle_copy($chosen);
}

// ---------- Esame simulato ----------
/** $topics: [id, exam_weight]; $pool: [id, topic_id, level]. Restituisce gli id scelti, in ordine casuale. */
function compose_exam(int $count, array $topics, array $pool, array $mix): array
{
    $count = max((int) cfg('exam.min', 30), min((int) cfg('exam.max', 50), $count));
    $perTopic = apportion($count, array_map(fn($t) => (float) $t['exam_weight'], $topics));
    $taken = [];
    $ids = [];
    foreach (array_values($topics) as $ti => $t) {
        $want = $perTopic[$ti];
        $perLevel = apportion($want, $mix);
        $mine = shuffle_copy(array_filter($pool, fn($q) => $q['topic_id'] === $t['id']));
        $picked = 0;
        for ($lv = 1; $lv <= 5; $lv++) {
            $got = 0;
            foreach ($mine as $q) {
                if ($got >= $perLevel[$lv - 1]) break;
                if ((int) $q['level'] === $lv && !isset($taken[$q['id']])) {
                    $taken[$q['id']] = true;
                    $ids[] = $q['id'];
                    $got++;
                    $picked++;
                }
            }
        }
        foreach ($mine as $q) {
            if ($picked >= $want) break;
            if (!isset($taken[$q['id']])) {
                $taken[$q['id']] = true;
                $ids[] = $q['id'];
                $picked++;
            }
        }
    }
    foreach (shuffle_copy($pool) as $q) {
        if (count($ids) >= $count) break;
        if (!isset($taken[$q['id']])) {
            $taken[$q['id']] = true;
            $ids[] = $q['id'];
        }
    }
    return shuffle_copy($ids);
}

/** $questions: [id, topic_id, correct]; $answers: id => 'A'..'D'|null. */
function grade_exam(array $questions, array $answers): array
{
    $byTopic = [];
    $right = 0;
    $blank = 0;
    foreach ($questions as $q) {
        $t = &$byTopic[$q['topic_id']];
        $t ??= ['total' => 0, 'wrong' => 0];
        $t['total']++;
        $a = $answers[$q['id']] ?? null;
        if (!$a) $blank++;
        if ($a === $q['correct']) $right++;
        else $t['wrong']++;
        unset($t);
    }
    $total = count($questions);
    $weak = [];
    foreach ($byTopic as $tid => $v) {
        if ($v['wrong'] > 0) $weak[] = ['topic_id' => $tid] + $v + ['rate' => $v['wrong'] / $v['total']];
    }
    usort($weak, fn($a, $b) => $b['rate'] <=> $a['rate'] ?: $b['wrong'] <=> $a['wrong']);
    return ['total' => $total, 'right' => $right, 'blank' => $blank, 'wrong' => $total - $right - $blank,
        'score' => $total ? $right / $total : 0, 'weak' => $weak];
}

// ---------- Media (solo host noti: niente iframe arbitrari) ----------
function parse_media_url(string $raw): ?array
{
    $u = parse_url(trim($raw));
    if (!$u || ($u['scheme'] ?? '') !== 'https' || empty($u['host'])) return null;
    $host = preg_replace('/^www\./', '', strtolower($u['host']));
    $path = $u['path'] ?? '';
    parse_str($u['query'] ?? '', $qs);
    $yt = fn($id) => preg_match('/^[\w-]{6,20}$/', (string) $id) ? ['type' => 'embed', 'src' => 'https://www.youtube-nocookie.com/embed/' . $id] : null;
    if (in_array($host, ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'], true)) {
        if ($path === '/watch') return $yt($qs['v'] ?? '');
        if (preg_match('#^/(embed|shorts)/([\w-]{6,20})$#', $path, $m)) return $yt($m[2]);
        return null;
    }
    if ($host === 'youtu.be') return $yt(ltrim($path, '/'));
    if ($host === 'vimeo.com' && preg_match('#^/(\d{5,12})$#', $path, $m)) return ['type' => 'embed', 'src' => 'https://player.vimeo.com/video/' . $m[1]];
    if ($host === 'open.spotify.com' && preg_match('#^/(episode|show)/([A-Za-z0-9]{10,30})$#', $path, $m)) return ['type' => 'embed', 'src' => "https://open.spotify.com/embed/{$m[1]}/{$m[2]}"];
    if (preg_match('/\.(mp3|m4a|wav|ogg)$/i', $path)) return ['type' => 'audio', 'src' => $raw];
    if (preg_match('/\.(mp4|webm)$/i', $path)) return ['type' => 'video', 'src' => $raw];
    return null;
}
