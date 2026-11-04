// SM-2 per le flashcard. Date come stringhe ISO "YYYY-MM-DD" (UTC).
export type CardState = { ease: number; intervalDays: number; repetitions: number; dueDate: string };

export const INITIAL_CARD = (today: string): CardState => ({ ease: 2.5, intervalDays: 0, repetitions: 0, dueDate: today });

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** quality 0-5 (SM-2 classico). Dal pulsante: "so" = 4, "non so" = 1. */
export function review(state: CardState, quality: number, today: string): CardState {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) throw new RangeError("quality deve essere un intero 0-5");
  let { ease, intervalDays, repetitions } = state;
  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(intervalDays * ease);
  }
  ease = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return { ease: Math.round(ease * 100) / 100, intervalDays, repetitions, dueDate: addDays(today, intervalDays) };
}

export const reviewKnown = (s: CardState, known: boolean, today: string) => review(s, known ? 4 : 1, today);
export const isDue = (s: CardState, today: string) => s.dueDate <= today;
