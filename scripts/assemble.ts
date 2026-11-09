// Uso: npm run assemble -- <argomento> <file-bozza.json>
// Trasforma una bozza scritta "a mano" (anche da Claude in sessione, senza API) nel formato finale:
// stesso schema di `generate` (summary, map, flashcards, questions con correct_option + wrong_options).
// Mescola le opzioni, assegna gli id, mette status=draft e valida. Poi: npm run validate / review / import.
import path from "node:path";
import { z } from "zod";
import { mapNodeSchema, subtopicContentSchema, type SubtopicContent } from "../src/lib/content/schemas";
import { buildQuestion } from "../src/lib/content/pipeline";
import { die, loadTopic, log, parseArgs, readJson, topicDir, writeJson } from "./lib/common";

const draftSchema = z.object({
  subtopic_id: z.string().min(1),
  summary: z.object({ markdown: z.string().min(50), key_points: z.array(z.string().min(1)).min(3).max(12) }),
  map: mapNodeSchema,
  flashcards: z.array(z.object({ front: z.string().min(3), back: z.string().min(1) })).min(5),
  questions: z.array(z.object({
    level: z.number().int().min(1).max(5),
    stem: z.string().min(10),
    correct_option: z.string().min(1),
    wrong_options: z.array(z.string().min(1)).length(3),
    explanation: z.string().min(20),
    reference: z.string().nullable().optional(),
  })).min(5),
});

const { pos } = parseArgs();
const [name, file] = pos;
if (!name || !file) die("Uso: npm run assemble -- <argomento> <bozza.json>");
const topic = loadTopic(name);
const g = draftSchema.parse(readJson(file));
const sid = g.subtopic_id;
const counters: Record<number, number> = {};
const content: SubtopicContent = subtopicContentSchema.parse({
  topic_id: topic.id,
  subtopic_id: sid,
  summary: { subtopic_id: sid, ...g.summary },
  map: g.map,
  flashcards: g.flashcards.map((f, i) => ({ id: `${sid}-fc-${i + 1}`, subtopic_id: sid, ...f })),
  questions: g.questions.map((q) => {
    counters[q.level] = (counters[q.level] ?? 0) + 1;
    return buildQuestion(q, { topicId: topic.id, subtopicId: sid, index: counters[q.level]! });
  }),
});
writeJson(path.join(topicDir(topic.id), `${sid}.json`), content);
log(`✔ ${sid}: ${content.questions.length} domande, ${content.flashcards.length} flashcard → validate`);
