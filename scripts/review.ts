// Uso: npm run review -- <argomento> [--sample=20] [--level=4,5] [--status=draft]
// Tasti: p = pubblica · r = rivista · d = scarta · s = salta · q = esci
import path from "node:path";
import readline from "node:readline/promises";
import { subtopicContentSchema, type Question, type SubtopicContent } from "../src/lib/content/schemas";
import { contentFiles, die, loadTopic, log, parseArgs, readJson, topicDir, writeJson } from "./lib/common";
import fs from "node:fs";

async function main() {
  const { pos, flags } = parseArgs();
  const name = pos[0];
  if (!name) die("Uso: npm run review -- <argomento> [--sample=N] [--level=4,5] [--status=draft]");
  const topic = loadTopic(name);
  const status = typeof flags.status === "string" ? flags.status : "draft";
  const levels = typeof flags.level === "string" ? flags.level.split(",").map(Number) : null;
  const sample = flags.sample ? Number(flags.sample) : Infinity;

  const files = new Map<string, SubtopicContent>();
  for (const f of contentFiles(topic.id)) files.set(f, subtopicContentSchema.parse(readJson(f)));

  let queue: { file: string; q: Question }[] = [];
  for (const [file, c] of files) for (const q of c.questions) if (q.status === status && (!levels || levels.includes(q.level))) queue.push({ file, q });
  // priorità L5, L4 ... poi mescola dentro ogni livello
  queue = queue.sort((a, b) => b.q.level - a.q.level || a.q.id.localeCompare(b.q.id)).slice(0, sample);
  if (!queue.length) return log("Nessuna domanda da rivedere con questi filtri.");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const rejected: Question[] = [];
  const rejFile = path.join(topicDir(topic.id), "rejected.json");
  if (fs.existsSync(rejFile)) rejected.push(...readJson<Question[]>(rejFile));

  const save = (file: string) => writeJson(file, files.get(file));
  let n = 0;
  for (const { file, q } of queue) {
    n++;
    console.log(`\n── ${n}/${queue.length} · ${q.id} · livello ${q.level} ──\n${q.stem}`);
    q.options.forEach((o) => console.log(`  ${o.key === q.correct ? "✔" : " "} ${o.key}) ${o.text}`));
    console.log(`Spiegazione: ${q.explanation}\nRiferimento: ${q.reference ?? "—"}`);
    const a = (await rl.question("[p]ubblica / [r]ivista / [d]scarta / [s]alta / [q]uit > ")).trim().toLowerCase();
    const c = files.get(file)!;
    if (a === "q") break;
    if (a === "p" || a === "r") {
      q.status = a === "p" ? "published" : "reviewed";
      save(file);
    } else if (a === "d") {
      c.questions = c.questions.filter((x) => x.id !== q.id);
      rejected.push(q);
      writeJson(rejFile, rejected);
      save(file);
    }
  }
  rl.close();
  log("Revisione salvata. Prossimo passo: npm run import -- " + topic.id + " --dry-run");
}
main().catch((e) => die(String(e)));
