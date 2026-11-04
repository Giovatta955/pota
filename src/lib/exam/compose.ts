// Composizione e correzione dell'esame simulato.
import { shuffle, type PoolQuestion, type Rng } from "../trainer/stats";
import { apportion } from "../util/apportion";

export { apportion };


export const DEFAULT_LEVEL_MIX = [0.2, 0.3, 0.3, 0.15, 0.05] as const;

export type ExamTopic = { topicId: string; weight: number };

export function composeExam(args: {
  count: number;
  topics: ExamTopic[];
  pool: PoolQuestion[];
  levelMix?: readonly number[];
  rng: Rng;
  minCount?: number;
  maxCount?: number;
}): { ids: string[]; shortfall: number } {
  const { topics, pool, rng } = args;
  const mix = args.levelMix ?? DEFAULT_LEVEL_MIX;
  const count = Math.min(args.maxCount ?? 50, Math.max(args.minCount ?? 30, Math.round(args.count)));

  const perTopic = apportion(count, topics.map((t) => t.weight));
  const taken = new Set<string>();
  const ids: string[] = [];

  topics.forEach((t, ti) => {
    const want = perTopic[ti]!;
    const perLevel = apportion(want, [...mix]);
    const mine = shuffle(pool.filter((q) => q.topicId === t.topicId), rng);
    const pickedHere: PoolQuestion[] = [];
    // prima il livello esatto
    for (let lv = 1; lv <= 5; lv++) {
      for (const q of mine.filter((q) => q.level === lv && !taken.has(q.id)).slice(0, perLevel[lv - 1]!)) {
        taken.add(q.id);
        pickedHere.push(q);
      }
    }
    // poi riempi con livelli vicini ai mancanti (stesso argomento)
    for (const q of mine) {
      if (pickedHere.length >= want) break;
      if (!taken.has(q.id)) {
        taken.add(q.id);
        pickedHere.push(q);
      }
    }
    ids.push(...pickedHere.map((q) => q.id));
  });

  // se un argomento non basta, completa da altri argomenti
  for (const q of shuffle(pool, rng)) {
    if (ids.length >= count) break;
    if (!taken.has(q.id)) {
      taken.add(q.id);
      ids.push(q.id);
    }
  }
  return { ids: shuffle(ids, rng), shortfall: Math.max(0, count - ids.length) };
}

export type GradedQuestion = { id: string; topicId: string; level: number; correct: string };

export function gradeExam(questions: GradedQuestion[], answers: Record<string, string | null | undefined>) {
  const byTopic: Record<string, { total: number; wrong: number }> = {};
  let right = 0;
  let blank = 0;
  const wrongIds: string[] = [];
  for (const q of questions) {
    const t = (byTopic[q.topicId] ??= { total: 0, wrong: 0 });
    t.total++;
    const a = answers[q.id];
    if (!a) blank++;
    if (a === q.correct) right++;
    else {
      t.wrong++;
      wrongIds.push(q.id);
    }
  }
  const total = questions.length;
  const weakTopics = Object.entries(byTopic)
    .map(([topicId, v]) => ({ topicId, ...v, errorRate: v.total ? v.wrong / v.total : 0 }))
    .filter((t) => t.wrong > 0)
    .sort((a, b) => b.errorRate - a.errorRate || b.wrong - a.wrong);
  return { total, right, wrong: total - right - blank, blank, score: total ? right / total : 0, wrongIds, weakTopics };
}
