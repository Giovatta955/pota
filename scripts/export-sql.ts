// Uso: npm run export-sql -- <argomento> [--publish] > file.sql
// Genera SQL idempotente (upsert) per caricare un argomento su Supabase dal SQL Editor o dall'API di gestione.
// Con --publish le domande vengono caricate come 'published'; senza, solo quelle già 'published'.
import { subtopicContentSchema } from "../src/lib/content/schemas";
import fs from "node:fs";
import path from "node:path";
import { contentFiles, die, loadTopic, parseArgs, readJson, topicDir } from "./lib/common";

const { pos, flags } = parseArgs();
const name = pos[0];
if (!name) die("Uso: npm run export-sql -- <argomento> [--publish]");
const topic = loadTopic(name);
// ordine dei sottoargomenti = ordine dei blocchi (cioè delle lezioni), non alfabetico
const blocksFile = path.join(topicDir(topic.id), "blocks.json");
const order = fs.existsSync(blocksFile) ? readJson<{ subtopic_id: string }[]>(blocksFile).map((b) => b.subtopic_id) : [];
const rank = (id: string) => (order.indexOf(id) === -1 ? 999 : order.indexOf(id));
const contents = contentFiles(topic.id)
  .map((f) => subtopicContentSchema.parse(readJson(f)))
  .sort((a, b) => rank(a.subtopic_id) - rank(b.subtopic_id) || a.subtopic_id.localeCompare(b.subtopic_id));
const TAG = "$q7$";
const q = (s: string) => {
  if (s.includes(TAG)) die(`Il testo contiene ${TAG}`);
  return `${TAG}${s}${TAG}`;
};
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const out: string[] = ["begin;"];
out.push(`insert into topics (id, title, exam_weight) values (${q(topic.id)}, ${q(topic.title)}, ${topic.exam_weight})
on conflict (id) do update set title = excluded.title, exam_weight = excluded.exam_weight;`);
contents.forEach((c, i) => {
  out.push(`insert into subtopics (id, topic_id, title, position, exam_weight, is_free) values (${q(c.subtopic_id)}, ${q(topic.id)}, ${q(c.map.title)}, ${i}, 1, ${topic.is_free})
on conflict (id) do update set title = excluded.title, position = excluded.position, is_free = excluded.is_free;`);
  out.push(`insert into summaries (subtopic_id, markdown, key_points) values (${q(c.subtopic_id)}, ${q(c.summary.markdown)}, ${j(c.summary.key_points)})
on conflict (subtopic_id) do update set markdown = excluded.markdown, key_points = excluded.key_points;`);
  out.push(`insert into maps (subtopic_id, tree) values (${q(c.subtopic_id)}, ${j(c.map)})
on conflict (subtopic_id) do update set tree = excluded.tree;`);
  for (const f of c.flashcards)
    out.push(`insert into flashcards (id, subtopic_id, front, back) values (${q(f.id)}, ${q(f.subtopic_id)}, ${q(f.front)}, ${q(f.back)})
on conflict (id) do update set front = excluded.front, back = excluded.back;`);
  for (const x of c.questions) {
    const status = flags.publish ? "published" : x.status;
    if (status !== "published") continue;
    out.push(`insert into questions (id, topic_id, subtopic_id, level, stem, options, correct, explanation, reference, source_kind, status, active)
values (${q(x.id)}, ${q(topic.id)}, ${q(x.subtopic_id)}, ${x.level}, ${q(x.stem)}, ${j(x.options)}, ${q(x.correct)}, ${q(x.explanation)}, ${x.reference ? q(x.reference) : "null"}, ${q(x.source_kind)}, 'published', true)
on conflict (id) do update set level = excluded.level, stem = excluded.stem, options = excluded.options, correct = excluded.correct, explanation = excluded.explanation, reference = excluded.reference, status = 'published';`);
  }
});
out.push("commit;");
console.log(out.join("\n"));
