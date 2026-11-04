// Uso: npm run import -- <argomento> [--dry-run]
// Carica su Supabase (service role) argomento, sottoargomenti, riassunti, mappe, flashcard e SOLO le domande 'published'.
// Idempotente (upsert per id).
import { createClient } from "@supabase/supabase-js";
import { subtopicContentSchema } from "../src/lib/content/schemas";
import { contentFiles, die, loadTopic, log, parseArgs, readJson } from "./lib/common";

async function main() {
  const { pos, flags } = parseArgs();
  const name = pos[0];
  if (!name) die("Uso: npm run import -- <argomento> [--dry-run]");
  const topic = loadTopic(name);
  const contents = contentFiles(topic.id).map((f) => subtopicContentSchema.parse(readJson(f)));
  if (!contents.length) die("Nessun contenuto generato.");

  const subtopics = contents.map((c, i) => ({ id: c.subtopic_id, topic_id: topic.id, title: c.map.title, position: i, exam_weight: 1, is_free: topic.is_free }));
  const summaries = contents.map((c) => ({ subtopic_id: c.subtopic_id, markdown: c.summary.markdown, key_points: c.summary.key_points }));
  const maps = contents.map((c) => ({ subtopic_id: c.subtopic_id, tree: c.map }));
  const flashcards = contents.flatMap((c) => c.flashcards.map((f) => ({ id: f.id, subtopic_id: f.subtopic_id, front: f.front, back: f.back })));
  const all = contents.flatMap((c) => c.questions);
  const questions = all.filter((q) => q.status === "published").map((q) => ({ ...q, active: true }));

  log(`Argomento ${topic.id} (gratis: ${topic.is_free}): ${subtopics.length} sottoargomenti, ${flashcards.length} flashcard, ${questions.length}/${all.length} domande published`);
  if (!questions.length) log("⚠ Nessuna domanda 'published': usa npm run review.");
  if (flags["dry-run"]) return log("--dry-run: nessuna scrittura.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) die("Servono NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const up = async (table: string, rows: object[], onConflict: string) => {
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await db.from(table).upsert(rows.slice(i, i + 200), { onConflict });
      if (error) die(`${table}: ${error.message}`);
    }
    log(`   ✔ ${table}: ${rows.length}`);
  };
  await up("topics", [{ id: topic.id, title: topic.title, exam_weight: topic.exam_weight }], "id");
  await up("subtopics", subtopics, "id");
  await up("summaries", summaries, "subtopic_id");
  await up("maps", maps, "subtopic_id");
  await up("flashcards", flashcards, "id");
  await up("questions", questions, "id");
  log("Import completato.");
}
main().catch((e) => die(String(e)));
