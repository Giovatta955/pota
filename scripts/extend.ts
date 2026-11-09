// Uso: npm run extend -- <argomento> <integrazione.json>
// Arricchisce un sottoargomento già assemblato SENZA toccare le domande esistenti
// (id, testo e ordine delle opzioni restano identici, così lo storico degli utenti resta valido).
// L'integrazione può sostituire riassunto e mappa e aggiungere flashcard e domande.
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { mapNodeSchema, subtopicContentSchema, type SubtopicContent } from "../src/lib/content/schemas";
import { buildQuestion } from "../src/lib/content/pipeline";
import { die, loadTopic, log, parseArgs, readJson, topicDir, writeJson } from "./lib/common";

const extSchema = z.object({
  subtopic_id: z.string().min(1),
  summary: z.object({ markdown: z.string().min(50), key_points: z.array(z.string().min(1)).min(3).max(12) }).optional(),
  map: mapNodeSchema.optional(),
  flashcards_add: z.array(z.object({ front: z.string().min(3), back: z.string().min(1) })).default([]),
  questions_add: z.array(z.object({
    level: z.number().int().min(1).max(5),
    stem: z.string().min(10),
    correct_option: z.string().min(1),
    wrong_options: z.array(z.string().min(1)).length(3),
    explanation: z.string().min(20),
    reference: z.string().nullable().optional(),
  })).default([]),
});

const { pos } = parseArgs();
const [name, file] = pos;
if (!name || !file) die("Uso: npm run extend -- <argomento> <integrazione.json>");
const topic = loadTopic(name);
const ext = extSchema.parse(readJson(file));
const sid = ext.subtopic_id;
const target = path.join(topicDir(topic.id), `${sid}.json`);
if (!fs.existsSync(target)) die(`Sottoargomento non assemblato: ${target}`);
const cur = subtopicContentSchema.parse(readJson(target));

// Nota: il titolo della radice della mappa diventa il titolo del sottoargomento (export-sql).

const counters: Record<number, number> = {};
for (const q of cur.questions) {
  const n = Number(q.id.split("-").pop());
  counters[q.level] = Math.max(counters[q.level] ?? 0, n);
}
const stems = new Set(cur.questions.map((q) => q.stem.toLowerCase()));
const added = ext.questions_add.map((q) => {
  if (stems.has(q.stem.toLowerCase())) die(`Domanda già presente: ${q.stem}`);
  stems.add(q.stem.toLowerCase());
  counters[q.level] = (counters[q.level] ?? 0) + 1;
  return buildQuestion(q, { topicId: topic.id, subtopicId: sid, index: counters[q.level]! });
});

const fcStart = cur.flashcards.length;
const content: SubtopicContent = subtopicContentSchema.parse({
  ...cur,
  summary: ext.summary ? { subtopic_id: sid, ...ext.summary } : cur.summary,
  map: ext.map ?? cur.map,
  flashcards: [...cur.flashcards, ...ext.flashcards_add.map((f, i) => ({ id: `${sid}-fc-${fcStart + i + 1}`, subtopic_id: sid, ...f }))],
  questions: [...cur.questions, ...added],
});
writeJson(target, content);
const perLevel = [1, 2, 3, 4, 5].map((l) => content.questions.filter((q) => q.level === l).length).join("/");
log(`✔ ${sid}: ${content.questions.length} domande (${perLevel}), ${content.flashcards.length} flashcard, riassunto ${content.summary.markdown.split(/\s+/).length} parole`);
