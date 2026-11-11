// Esporta i contenuti (content/generated/<argomento>/*.json) in un file SQL per MySQL/MariaDB.
// Uso, dalla cartella principale del progetto:  node php/tools/export-mysql.mjs > php/sql/contenuti.sql
// I riassunti vengono convertiti da Markdown a HTML qui, così il sito PHP non ha bisogno di librerie.
import fs from "node:fs";
import path from "node:path";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

const ROOT = path.resolve(process.argv[2] ?? "content/generated");
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

// Stringhe SQL sicure per MySQL (modalità standard: backslash e apice vanno escapati)
const s = (v) => (v === null || v === undefined ? "NULL" : "'" + String(v).replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\0/g, "") + "'");
const n = (v) => String(Number(v));

const CALLOUTS = [
  [/^(attenzione|trappol)/i, "co-warn"],
  [/^(esempio|in classe|caso)/i, "co-example"],
  [/^(da ricordare|ricorda|in sintesi|nota)/i, "co-remember"],
];
function mdToHtml(md) {
  // allowDangerousHtml resta disattivato: eventuale HTML nel testo viene mostrato come testo
  let html = micromark(md, { extensions: [gfm()], htmlExtensions: [gfmHtml()] });
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  html = html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (m, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const cls = CALLOUTS.find(([re]) => re.test(text))?.[1];
    return cls ? `<blockquote class="${cls}">${inner}</blockquote>` : m;
  });
  return html;
}

const out = [
  "-- Contenuti generati automaticamente: importare DOPO schema.sql.",
  "-- Rieseguibile: aggiorna i contenuti esistenti senza toccare utenti e progressi.",
  "SET NAMES utf8mb4;",
  "START TRANSACTION;",
];
let stats = { topics: 0, subtopics: 0, questions: 0, flashcards: 0 };

const topics = fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, "topic.json")) && d !== "demo-didattica").sort();
topics.forEach((dir, ti) => {
  const tdir = path.join(ROOT, dir);
  const topic = readJson(path.join(tdir, "topic.json"));
  const blocksFile = path.join(tdir, "blocks.json");
  const order = fs.existsSync(blocksFile) ? readJson(blocksFile).map((b) => b.subtopic_id) : [];
  const rank = (id) => (order.indexOf(id) === -1 ? 999 : order.indexOf(id));
  const files = fs.readdirSync(tdir).filter((f) => f.endsWith(".json") && f !== "topic.json" && f !== "blocks.json");
  const contents = files.map((f) => readJson(path.join(tdir, f))).sort((a, b) => rank(a.subtopic_id) - rank(b.subtopic_id) || a.subtopic_id.localeCompare(b.subtopic_id));
  out.push(`INSERT INTO topics (id, title, position, exam_weight) VALUES (${s(topic.id)}, ${s(topic.title)}, ${ti}, ${n(topic.exam_weight ?? 1)})
ON DUPLICATE KEY UPDATE title = VALUES(title), exam_weight = VALUES(exam_weight);`);
  stats.topics++;
  contents.forEach((c, i) => {
    out.push(`INSERT INTO subtopics (id, topic_id, title, position, exam_weight, is_free) VALUES (${s(c.subtopic_id)}, ${s(topic.id)}, ${s(c.map.title)}, ${i}, 1, ${topic.is_free ? 1 : 0})
ON DUPLICATE KEY UPDATE title = VALUES(title), position = VALUES(position), is_free = VALUES(is_free);`);
    out.push(`INSERT INTO summaries (subtopic_id, html, key_points) VALUES (${s(c.subtopic_id)}, ${s(mdToHtml(c.summary.markdown))}, ${s(JSON.stringify(c.summary.key_points ?? []))})
ON DUPLICATE KEY UPDATE html = VALUES(html), key_points = VALUES(key_points);`);
    out.push(`INSERT INTO maps (subtopic_id, tree) VALUES (${s(c.subtopic_id)}, ${s(JSON.stringify(c.map))})
ON DUPLICATE KEY UPDATE tree = VALUES(tree);`);
    stats.subtopics++;
    for (const f of c.flashcards) {
      out.push(`INSERT INTO flashcards (id, subtopic_id, front, back) VALUES (${s(f.id)}, ${s(f.subtopic_id)}, ${s(f.front)}, ${s(f.back)})
ON DUPLICATE KEY UPDATE front = VALUES(front), back = VALUES(back);`);
      stats.flashcards++;
    }
    for (const q of c.questions) {
      out.push(`INSERT INTO questions (id, topic_id, subtopic_id, level, stem, options, correct, explanation, reference, status, active)
VALUES (${s(q.id)}, ${s(topic.id)}, ${s(q.subtopic_id)}, ${n(q.level)}, ${s(q.stem)}, ${s(JSON.stringify(q.options))}, ${s(q.correct)}, ${s(q.explanation)}, ${s(q.reference ?? null)}, 'published', 1)
ON DUPLICATE KEY UPDATE level = VALUES(level), stem = VALUES(stem), options = VALUES(options), correct = VALUES(correct), explanation = VALUES(explanation), reference = VALUES(reference), status = 'published';`);
      stats.questions++;
    }
  });
});
out.push("COMMIT;");
process.stdout.write(out.join("\n") + "\n");
process.stderr.write(`Esportati: ${stats.topics} argomenti, ${stats.subtopics} sottoargomenti, ${stats.questions} domande, ${stats.flashcards} flashcard\n`);
