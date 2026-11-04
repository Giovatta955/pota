import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { questionSchema, subtopicContentSchema } from "@/lib/content/schemas";

const seed = JSON.parse(readFileSync("content/seed/esempio.json", "utf8"));
const q = seed.questions[0];

describe("schemi contenuti", () => {
  it("il seed è valido", () => {
    expect(subtopicContentSchema.safeParse(seed).success).toBe(true);
  });
  it("rifiuta meno di 4 opzioni", () => {
    expect(questionSchema.safeParse({ ...q, options: q.options.slice(0, 3) }).success).toBe(false);
  });
  it("rifiuta opzioni duplicate", () => {
    const options = q.options.map((o: { key: string; text: string }) => ({ ...o, text: "uguale" }));
    expect(questionSchema.safeParse({ ...q, options }).success).toBe(false);
  });
  it("rifiuta spiegazione mancante", () => {
    expect(questionSchema.safeParse({ ...q, explanation: "" }).success).toBe(false);
  });
  it("prova ufficiale senza riferimento è rifiutata", () => {
    expect(questionSchema.safeParse({ ...q, source_kind: "official_past_exam", reference: null }).success).toBe(false);
  });
  it("rifiuta livello fuori range", () => {
    expect(questionSchema.safeParse({ ...q, level: 6 }).success).toBe(false);
  });
});
