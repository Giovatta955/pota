import { describe, it, expect } from "vitest";
import { review, reviewKnown, INITIAL_CARD, isDue, addDays } from "@/lib/srs/sm2";
import { updateEma, nextLevel, rankWeakTopics, composeTrainerSession, type PoolQuestion, type TopicStat } from "@/lib/trainer/stats";
import { apportion, composeExam, gradeExam } from "@/lib/exam/compose";
import { hasPaidAccess, canReadSubtopic, canUsePaidFeatures } from "@/lib/access";

const lcg = (seed = 1) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const T = "2026-11-04";

describe("SM-2", () => {
  it("intervalli 1 → 6 → moltiplicati per ease", () => {
    let s = INITIAL_CARD(T);
    s = review(s, 4, T); expect(s.intervalDays).toBe(1);
    s = review(s, 4, T); expect(s.intervalDays).toBe(6);
    s = review(s, 4, T); expect(s.intervalDays).toBe(Math.round(6 * s.ease));
    expect(s.repetitions).toBe(3);
  });
  it("errore azzera ripetizioni e riporta a 1 giorno", () => {
    let s = review(review(INITIAL_CARD(T), 5, T), 5, T);
    s = reviewKnown(s, false, T);
    expect(s.repetitions).toBe(0);
    expect(s.intervalDays).toBe(1);
  });
  it("ease non scende sotto 1.3", () => {
    let s = INITIAL_CARD(T);
    for (let i = 0; i < 30; i++) s = review(s, 0, T);
    expect(s.ease).toBe(1.3);
  });
  it("quality 4 non cambia ease; 5 la alza", () => {
    expect(review(INITIAL_CARD(T), 4, T).ease).toBe(2.5);
    expect(review(INITIAL_CARD(T), 5, T).ease).toBe(2.6);
  });
  it("scadenza e date", () => {
    const s = review(INITIAL_CARD(T), 4, T);
    expect(s.dueDate).toBe("2026-11-05");
    expect(isDue(s, T)).toBe(false);
    expect(isDue(s, "2026-11-05")).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("rifiuta quality non valida", () => {
    expect(() => review(INITIAL_CARD(T), 6, T)).toThrow();
  });
});

describe("allenatore: EMA e livelli", () => {
  it("EMA pesa di più le risposte recenti", () => {
    let e = 0.5;
    for (let i = 0; i < 10; i++) e = updateEma(e, true);
    expect(e).toBeGreaterThan(0.85);
    e = updateEma(e, false);
    expect(e).toBeLessThan(0.85);
  });
  it("sale con ≥80% su 10", () => {
    expect(nextLevel(2, [...Array(8).fill(true), false, false])).toBe(3);
  });
  it("non sale oltre 5, non scende sotto 1", () => {
    expect(nextLevel(5, Array(10).fill(true))).toBe(5);
    expect(nextLevel(1, Array(10).fill(false))).toBe(1);
  });
  it("scende sotto il 50%", () => {
    expect(nextLevel(3, [...Array(4).fill(true), ...Array(6).fill(false)])).toBe(2);
  });
  it("resta fermo tra 50% e 80% e con pochi dati", () => {
    expect(nextLevel(3, [...Array(7).fill(true), ...Array(3).fill(false)])).toBe(3);
    expect(nextLevel(3, [true, false, true])).toBe(3);
  });
  it("classifica deboli: ordina per debolezza, ignora mai tentati", () => {
    const stats: TopicStat[] = [
      { topicId: "a", accuracyEma: 0.9, currentLevel: 1, nAnswers: 10 },
      { topicId: "b", accuracyEma: 0.3, currentLevel: 1, nAnswers: 10 },
      { topicId: "c", accuracyEma: 0.5, currentLevel: 1, nAnswers: 0 },
    ];
    expect(rankWeakTopics(stats).map((s) => s.topicId)).toEqual(["b", "a"]);
  });
});

const pool: PoolQuestion[] = ["a", "b", "c"].flatMap((t) =>
  [1, 2, 3, 4, 5].flatMap((l) => Array.from({ length: 6 }, (_, i) => ({ id: `${t}-L${l}-${i}`, topicId: t, level: l }))),
);

describe("sessione allenatore", () => {
  const stats: TopicStat[] = [
    { topicId: "a", accuracyEma: 0.95, currentLevel: 2, nAnswers: 20 },
    { topicId: "b", accuracyEma: 0.2, currentLevel: 3, nAnswers: 20 },
    { topicId: "c", accuracyEma: 0.6, currentLevel: 2, nAnswers: 20 },
  ];
  const seen = new Set(pool.filter((q) => q.level <= 3).map((q) => q.id));
  it("~60% dall'argomento più debole, nessun duplicato, dimensione corretta", () => {
    const ids = composeTrainerSession({ size: 20, stats, pool, seenIds: seen, wrongIds: new Set(), rng: lcg(7) });
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);
    const fromWeak = ids.filter((id) => id.startsWith("b-")).length;
    expect(fromWeak).toBeGreaterThanOrEqual(8);
  });
  it("include almeno qualche domanda nuova", () => {
    const ids = composeTrainerSession({ size: 20, stats, pool, seenIds: seen, wrongIds: new Set(), rng: lcg(3) });
    expect(ids.filter((id) => !seen.has(id)).length).toBeGreaterThanOrEqual(2);
  });
  it("se il pool è piccolo restituisce quello che c'è", () => {
    const small = pool.slice(0, 5);
    const ids = composeTrainerSession({ size: 20, stats, pool: small, seenIds: new Set(), wrongIds: new Set(), rng: lcg() });
    expect(ids).toHaveLength(5);
  });
});

describe("esame", () => {
  it("apportion somma sempre al totale", () => {
    for (const total of [30, 37, 50]) {
      const r = apportion(total, [3, 2, 2, 1.5, 0.3]);
      expect(r.reduce((a, b) => a + b, 0)).toBe(total);
    }
    expect(apportion(10, [0, 0])).toEqual([5, 5]);
  });
  it("compone N domande proporzionali ai pesi e al mix livelli", () => {
    const { ids, shortfall } = composeExam({
      count: 40, topics: [{ topicId: "a", weight: 2 }, { topicId: "b", weight: 1 }, { topicId: "c", weight: 1 }], pool, rng: lcg(5),
    });
    expect(shortfall).toBe(0);
    expect(ids).toHaveLength(40);
    expect(new Set(ids).size).toBe(40);
    expect(ids.filter((i) => i.startsWith("a-"))).toHaveLength(20);
    const l2 = ids.filter((i) => i.includes("-L2-")).length;
    expect(l2).toBeGreaterThanOrEqual(10);
    expect(l2).toBeLessThanOrEqual(14);
  });
  it("limita il numero a 30–50", () => {
    const topics = [{ topicId: "a", weight: 1 }, { topicId: "b", weight: 1 }, { topicId: "c", weight: 1 }];
    expect(composeExam({ count: 5, topics, pool, rng: lcg() }).ids).toHaveLength(30);
    expect(composeExam({ count: 99, topics, pool, rng: lcg() }).ids).toHaveLength(50);
  });
  it("completa da altri argomenti e segnala shortfall se il pool non basta", () => {
    const tiny = pool.filter((q) => q.topicId === "a").slice(0, 10);
    const r = composeExam({ count: 30, topics: [{ topicId: "a", weight: 1 }, { topicId: "b", weight: 1 }], pool: tiny, rng: lcg() });
    expect(r.ids).toHaveLength(10);
    expect(r.shortfall).toBe(20);
  });
  it("corregge e indica gli argomenti deboli", () => {
    const qs = [
      { id: "1", topicId: "a", level: 1, correct: "A" },
      { id: "2", topicId: "a", level: 2, correct: "B" },
      { id: "3", topicId: "b", level: 3, correct: "C" },
      { id: "4", topicId: "b", level: 3, correct: "D" },
    ];
    const g = gradeExam(qs, { "1": "A", "2": "C", "3": "A", "4": null });
    expect(g).toMatchObject({ total: 4, right: 1, wrong: 2, blank: 1, score: 0.25 });
    expect(g.weakTopics.map((t) => t.topicId)).toEqual(["b", "a"]); // b: 2/2 errate (1 in bianco), a: 1/2
    expect(g.wrongIds.sort()).toEqual(["2", "3", "4"]);
  });
});

describe("paywall", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  const future = new Date("2026-12-01T00:00:00Z");
  const past = new Date("2026-10-01T00:00:00Z");
  it("sottoargomento gratis: accessibile anche da anonimo", () => {
    expect(canReadSubtopic({ isFree: true }, null, now)).toBe(true);
  });
  it("a pagamento: anonimo no, senza abbonamento no", () => {
    expect(canReadSubtopic({ isFree: false }, null, now)).toBe(false);
    expect(canReadSubtopic({ isFree: false }, { isAdmin: false, subs: [] }, now)).toBe(false);
  });
  it("abbonamento attivo/trialing sì; scaduto, cancellato, past_due no", () => {
    expect(hasPaidAccess([{ status: "active", currentPeriodEnd: future }], now)).toBe(true);
    expect(hasPaidAccess([{ status: "trialing", currentPeriodEnd: null }], now)).toBe(true);
    expect(hasPaidAccess([{ status: "active", currentPeriodEnd: past }], now)).toBe(false);
    expect(hasPaidAccess([{ status: "canceled", currentPeriodEnd: future }], now)).toBe(false);
    expect(hasPaidAccess([{ status: "past_due", currentPeriodEnd: future }], now)).toBe(false);
  });
  it("admin accede sempre; esame solo a pagamento", () => {
    expect(canReadSubtopic({ isFree: false }, { isAdmin: true, subs: [] }, now)).toBe(true);
    expect(canUsePaidFeatures(null, now)).toBe(false);
    expect(canUsePaidFeatures({ isAdmin: false, subs: [{ status: "active", currentPeriodEnd: future }] }, now)).toBe(true);
  });
});

import { applyAnswer } from "@/lib/trainer/stats";
describe("applyAnswer", () => {
  it("aggiorna ema, contatore e livello", () => {
    const s = applyAnswer({ topicId: "a", accuracyEma: 0.5, currentLevel: 2, nAnswers: 9 }, true, Array(10).fill(true));
    expect(s.nAnswers).toBe(10);
    expect(s.accuracyEma).toBeCloseTo(0.6);
    expect(s.currentLevel).toBe(3);
  });
});
