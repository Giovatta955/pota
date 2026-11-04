import { describe, it, expect } from "vitest";
import { questionSchema } from "@/lib/content/schemas";
import {
  buildQuestion, checkQuestionSet, splitIntoBlocks, slugify, longestSharedRun, estimateCostUsd,
} from "@/lib/content/pipeline";

const raw = (level: number, n: number) => ({
  level,
  stem: `Domanda numero ${n} sul tema ${"x".repeat(n)} del livello ${level}?`,
  correct_option: "Risposta giusta " + n,
  wrong_options: ["Sbagliata uno " + n, "Sbagliata due " + n, "Sbagliata tre " + n],
  explanation: "Perché è la giusta e le altre sono sbagliate per motivi diversi.",
});

describe("pipeline", () => {
  it("slugify rimuove accenti", () => expect(slugify("Perché è così!")).toBe("perche-e-cosi"));

  it("buildQuestion produce una domanda valida, deterministica, con 1 sola corretta", () => {
    const ctx = { topicId: "t", subtopicId: "t-s", index: 1 };
    const a = buildQuestion(raw(2, 1), ctx);
    const b = buildQuestion(raw(2, 1), ctx);
    expect(a).toEqual(b);
    expect(questionSchema.safeParse(a).success).toBe(true);
    expect(a.options.find((o) => o.key === a.correct)!.text).toBe("Risposta giusta 1");
    expect(a.status).toBe("draft");
  });

  it("shuffle bilancia le lettere corrette", () => {
    const qs = Array.from({ length: 100 }, (_, i) => buildQuestion(raw((i % 5) + 1, i), { topicId: "t", subtopicId: "t-s", index: i }));
    const c: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    qs.forEach((q) => c[q.correct]!++);
    Object.values(c).forEach((v) => { expect(v).toBeGreaterThan(12); expect(v).toBeLessThan(40); });
  });

  it("rileva quasi-duplicati", () => {
    const ctx = (i: number) => ({ topicId: "t", subtopicId: "t-s", index: i });
    const a = buildQuestion(raw(1, 1), ctx(1));
    const b = { ...buildQuestion(raw(1, 2), ctx(2)), stem: a.stem + " " };
    expect(checkQuestionSet([a, b]).some((i) => i.message.includes("quasi-duplicato"))).toBe(true);
  });

  it("rileva 'tutte le precedenti'", () => {
    const q = buildQuestion({ ...raw(1, 1), wrong_options: ["Tutte le precedenti", "b b b", "c c c"] }, { topicId: "t", subtopicId: "s", index: 1 });
    expect(checkQuestionSet([q]).some((i) => i.severity === "error")).toBe(true);
  });

  it("rileva copia letterale dalla fonte", () => {
    const src = "uno due tre quattro cinque sei sette otto nove dieci undici dodici tredici";
    expect(longestSharedRun("prefisso uno due tre quattro cinque sei sette otto nove dieci undici dodici suffisso", src)).toBe(true);
    expect(longestSharedRun("parole completamente diverse da quelle della fonte originale usata qui", src)).toBe(false);
  });

  it("splitIntoBlocks usa le intestazioni e ignora sezioni vuote", () => {
    const long = "parola ".repeat(80);
    const blocks = splitIntoBlocks(`# A\n${long}\n## B\nbreve\n## C\n${long}`, { topicId: "t", sourceFile: "f.md" });
    expect(blocks.map((b) => b.title)).toEqual(["A", "C"]);
    expect(blocks[0]!.subtopic_id).toBe("t-a");
  });

  it("stima costi", () => {
    expect(estimateCostUsd("claude-sonnet-5-5", 1_000_000, 100_000)).toBeCloseTo(3);
    expect(estimateCostUsd("modello-ignoto", 1, 1)).toBeNull();
  });
});
