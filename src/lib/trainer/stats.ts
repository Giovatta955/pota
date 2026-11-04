// Statistiche per argomento, livelli e sessione dell'allenatore. Tutto puro (rng iniettabile).
import { apportion } from "../util/apportion";

export type Rng = () => number;

export const EMA_ALPHA = 0.2; // peso delle risposte recenti
export const LEVEL_WINDOW = 10;
export const LEVEL_UP_AT = 0.8;
export const LEVEL_DOWN_BELOW = 0.5;

export function updateEma(prev: number, correct: boolean, alpha = EMA_ALPHA): number {
  return alpha * (correct ? 1 : 0) + (1 - alpha) * prev;
}
export const weakness = (accuracyEma: number) => 1 - accuracyEma;

/** `recent` = esiti (true/false) sull'argomento al livello corrente, dal più vecchio al più recente. */
export function nextLevel(current: number, recent: boolean[]): number {
  const last = recent.slice(-LEVEL_WINDOW);
  if (last.length >= LEVEL_WINDOW) {
    const acc = last.filter(Boolean).length / last.length;
    if (acc >= LEVEL_UP_AT) return Math.min(5, current + 1);
    if (acc < LEVEL_DOWN_BELOW) return Math.max(1, current - 1);
  } else if (last.length >= 5) {
    // sotto soglia di finestra: scendi solo se chiaramente in difficoltà (<50% su ≥5 risposte)
    if (last.filter(Boolean).length / last.length < LEVEL_DOWN_BELOW) return Math.max(1, current - 1);
  }
  return current;
}

export type TopicStat = { topicId: string; accuracyEma: number; currentLevel: number; nAnswers: number };

/** Classifica argomenti dal più debole. Gli argomenti mai tentati non sono "deboli": restano in fondo. */
export function rankWeakTopics(stats: TopicStat[]): (TopicStat & { weakness: number })[] {
  return stats
    .filter((s) => s.nAnswers > 0)
    .map((s) => ({ ...s, weakness: weakness(s.accuracyEma) }))
    .sort((a, b) => b.weakness - a.weakness || b.nAnswers - a.nAnswers);
}

export type PoolQuestion = { id: string; topicId: string; level: number };

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export const SESSION_MIX = { weak: 0.6, mixed: 0.3, fresh: 0.1 } as const;

/**
 * Sessione allenatore: ~60% dagli argomenti più deboli (al loro livello corrente, prima le già sbagliate),
 * ~30% miste, ~10% nuove (mai viste). Se manca materiale, riempie con ciò che resta.
 */
export function composeTrainerSession(args: {
  size: number;
  stats: TopicStat[];
  pool: PoolQuestion[];
  seenIds: Set<string>;
  wrongIds: Set<string>;
  rng: Rng;
}): string[] {
  const { size, stats, pool, seenIds, wrongIds, rng } = args;
  const levelOf = new Map(stats.map((s) => [s.topicId, s.currentLevel]));
  const chosen: string[] = [];
  const taken = new Set<string>();
  const take = (q: PoolQuestion | undefined) => {
    if (q && !taken.has(q.id) && chosen.length < size) {
      taken.add(q.id);
      chosen.push(q.id);
      return true;
    }
    return false;
  };

  const nWeak = Math.round(size * SESSION_MIX.weak);
  const nFresh = Math.round(size * SESSION_MIX.fresh);

  // 1) deboli: quota ripartita tra i 3 argomenti più deboli in proporzione alla debolezza;
  //    dentro ogni argomento prima le già sbagliate, poi il livello corrente, poi quelli adiacenti.
  const weak = rankWeakTopics(stats).slice(0, 3);
  const quotas = apportion(nWeak, weak.map((w) => w.weakness + 0.01));
  const weakCands = weak.map((w) => {
    const lv = levelOf.get(w.topicId) ?? 1;
    const mine = shuffle(pool.filter((q) => q.topicId === w.topicId && Math.abs(q.level - lv) <= 1), rng);
    const rank = (q: PoolQuestion) => (wrongIds.has(q.id) ? 0 : 1) * 10 + Math.abs(q.level - lv);
    return mine.sort((a, b) => rank(a) - rank(b));
  });
  weakCands.forEach((cands, i) => {
    let n = 0;
    while (n < quotas[i]! && cands.length) if (take(cands.shift())) n++;
  });
  // quota non coperta (argomento senza abbastanza domande): passa al prossimo più debole
  for (const cands of weakCands) {
    while (chosen.length < nWeak && cands.length) take(cands.shift());
  }

  // 2) nuove: mai viste, qualunque argomento, livello corrente ±0
  const fresh = shuffle(pool.filter((q) => !seenIds.has(q.id) && !taken.has(q.id)), rng);
  let f = 0;
  for (const q of fresh) {
    if (f >= nFresh) break;
    if (take(q)) f++;
  }

  // 3) miste: livello corrente ±1 dell'argomento, tutti gli argomenti
  const mixed = shuffle(
    pool.filter((q) => !taken.has(q.id) && Math.abs(q.level - (levelOf.get(q.topicId) ?? 1)) <= 1),
    rng,
  );
  const nMixed = size - nWeak - nFresh;
  let m = 0;
  for (const q of mixed) {
    if (m >= nMixed) break;
    if (take(q)) m++;
  }

  // 4) riempimento se mancano domande
  for (const q of shuffle(pool, rng)) if (!take(q)) if (chosen.length >= size) break;

  return shuffle(chosen, rng);
}

/** Aggiorna le statistiche di un argomento dopo una risposta. `recentAtLevel` = esiti già registrati al livello corrente (vecchio→nuovo), questa risposta inclusa. */
export function applyAnswer(stat: TopicStat, correct: boolean, recentAtLevel: boolean[]): TopicStat {
  const level = nextLevel(stat.currentLevel, recentAtLevel);
  return { ...stat, accuracyEma: updateEma(stat.accuracyEma, correct), nAnswers: stat.nAnswers + 1, currentLevel: level };
}
