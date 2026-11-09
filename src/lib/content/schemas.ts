import { z } from "zod";

export const LEVELS = [1, 2, 3, 4, 5] as const;
export const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export const optionSchema = z.object({
  key: z.enum(OPTION_KEYS),
  text: z.string().trim().min(1).max(400),
});

export const questionSchema = z
  .object({
    id: z.string().min(1),
    topic_id: z.string().min(1),
    subtopic_id: z.string().min(1),
    level: z.number().int().min(1).max(5),
    stem: z.string().trim().min(10).max(1200),
    options: z.array(optionSchema).length(4),
    correct: z.enum(OPTION_KEYS),
    explanation: z.string().trim().min(20).max(2000),
    reference: z.string().trim().min(1).nullable(),
    source_kind: z.enum(["original", "official_past_exam"]),
    status: z.enum(["draft", "reviewed", "published"]),
  })
  .superRefine((q, ctx) => {
    const keys = q.options.map((o) => o.key);
    if (new Set(keys).size !== 4 || !OPTION_KEYS.every((k) => keys.includes(k))) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Le opzioni devono essere A, B, C, D senza duplicati" });
    }
    const texts = q.options.map((o) => o.text.toLowerCase());
    if (new Set(texts).size !== 4) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Opzioni con testo duplicato" });
    }
    if (q.source_kind === "official_past_exam" && !q.reference) {
      ctx.addIssue({ code: "custom", path: ["reference"], message: "Le prove ufficiali richiedono un riferimento alla fonte" });
    }
  });
export type Question = z.infer<typeof questionSchema>;

/** `rel`: frase di collegamento dal nodo padre (es. "si divide in"), mostrata sul ramo. */
export type MapNode = { title: string; rel?: string; note?: string; children?: MapNode[] };
export const mapNodeSchema: z.ZodType<MapNode> = z.lazy(() =>
  z.object({
    title: z.string().trim().min(1).max(200),
    rel: z.string().trim().max(60).optional(),
    note: z.string().trim().max(600).optional(),
    children: z.array(mapNodeSchema).optional(),
  }),
);

export const flashcardSchema = z.object({
  id: z.string().min(1),
  subtopic_id: z.string().min(1),
  front: z.string().trim().min(3).max(400),
  back: z.string().trim().min(1).max(800),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

export const summarySchema = z.object({
  subtopic_id: z.string().min(1),
  markdown: z.string().trim().min(50),
  key_points: z.array(z.string().trim().min(1)).min(3).max(12),
});
export type Summary = z.infer<typeof summarySchema>;

/** Pacchetto di contenuti di un sottoargomento (output di `generate`). */
export const subtopicContentSchema = z.object({
  topic_id: z.string().min(1),
  subtopic_id: z.string().min(1),
  summary: summarySchema,
  map: mapNodeSchema,
  flashcards: z.array(flashcardSchema).min(1),
  questions: z.array(questionSchema).min(1),
});
export type SubtopicContent = z.infer<typeof subtopicContentSchema>;
