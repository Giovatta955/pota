// Uso: npm run validate -- <argomento>   (exit code 1 se ci sono errori)
import fs from "node:fs";
import path from "node:path";
import { subtopicContentSchema, type SubtopicContent } from "../src/lib/content/schemas";
import { checkQuestionSet, jaccard, longestSharedRun, type Block } from "../src/lib/content/pipeline";
import { contentFiles, die, loadTopic, log, parseArgs, readJson, topicDir } from "./lib/common";

function main() {
  const name = parseArgs().pos[0];
  if (!name) die("Uso: npm run validate -- <argomento>");
  const topic = loadTopic(name);
  const blocksFile = path.join(topicDir(topic.id), "blocks.json");
  const blocks = fs.existsSync(blocksFile) ? readJson<Block[]>(blocksFile) : [];
  const files = contentFiles(topic.id);
  if (!files.length) die("Nessun contenuto generato.");

  let errors = 0;
  let warns = 0;
  for (const f of files) {
    const label = path.basename(f, ".json");
    const parsed = subtopicContentSchema.safeParse(readJson(f));
    if (!parsed.success) {
      errors++;
      log(`✖ ${label}: schema non valido → ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      continue;
    }
    const c: SubtopicContent = parsed.data;
    const src = blocks.find((b) => b.subtopic_id === c.subtopic_id)?.text;
    const issues = checkQuestionSet(c.questions, { sourceText: src });
    // flashcard duplicate / copiate
    for (let i = 0; i < c.flashcards.length; i++)
      for (let j = i + 1; j < c.flashcards.length; j++)
        if (jaccard(c.flashcards[i]!.front, c.flashcards[j]!.front) >= 0.85)
          issues.push({ severity: "warn", id: c.flashcards[i]!.id, message: `flashcard quasi-duplicata di ${c.flashcards[j]!.id}` });
    if (src && longestSharedRun(c.summary.markdown, src))
      issues.push({ severity: "error", message: "riassunto: testo copiato dalla fonte (≥12 parole identiche)" });
    const e = issues.filter((i) => i.severity === "error");
    const w = issues.filter((i) => i.severity === "warn");
    errors += e.length;
    warns += w.length;
    log(`${e.length ? "✖" : w.length ? "⚠" : "✔"} ${label}: ${c.questions.length} domande, ${c.flashcards.length} flashcard, ${e.length} errori, ${w.length} avvisi`);
    for (const i of issues) log(`     ${i.severity === "error" ? "ERRORE" : "avviso"}${i.id ? ` [${i.id}]` : ""}: ${i.message}`);
  }
  log(`Totale: ${errors} errori, ${warns} avvisi`);
  process.exit(errors ? 1 : 0);
}
main();
