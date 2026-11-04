// Uso: npm run ingest -- <argomento> [--title="Titolo"] [--weight=1] [--free]
import fs from "node:fs";
import path from "node:path";
import { splitIntoBlocks, slugify, type Block } from "../src/lib/content/pipeline";
import { SOURCES, topicDir, log, die, parseArgs, writeJson, readJson, type TopicMeta } from "./lib/common";

async function extract(file: string): Promise<string> {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".txt" || ext === ".md") return fs.readFileSync(file, "utf8");
  if (ext === ".pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(file)));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  return "";
}

async function main() {
  const { pos, flags } = parseArgs();
  const name = pos[0];
  if (!name) die("Uso: npm run ingest -- <argomento> [--title=...] [--weight=1] [--free]");
  const id = slugify(name);
  const srcDir = path.join(SOURCES, name);
  if (!fs.existsSync(srcDir)) die(`Cartella mancante: sources/${name}/ (mettici i tuoi .txt/.md/.pdf)`);

  const files = fs.readdirSync(srcDir).filter((f) => /\.(txt|md|pdf)$/i.test(f)).sort();
  if (!files.length) die(`Nessun .txt/.md/.pdf in sources/${name}/`);

  const blocks: Block[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    const text = await extract(path.join(srcDir, f));
    if (!text.trim()) {
      log(`⚠ ${f}: nessun testo estratto (PDF scansionato? serve OCR) — saltato`);
      continue;
    }
    for (const b of splitIntoBlocks(text, { topicId: id, sourceFile: f })) {
      let sid = b.subtopic_id;
      for (let i = 2; seen.has(sid); i++) sid = `${b.subtopic_id}-${i}`;
      seen.add(sid);
      blocks.push({ ...b, subtopic_id: sid });
    }
    log(`${f}: ok`);
  }
  if (!blocks.length) die("Nessun blocco utile trovato (sezioni troppo brevi?). Usa intestazioni '# Titolo' nei .md/.txt.");

  const dir = topicDir(id);
  const metaFile = path.join(dir, "topic.json");
  const prev: Partial<TopicMeta> = fs.existsSync(metaFile) ? readJson<TopicMeta>(metaFile) : {};
  const meta: TopicMeta = {
    id,
    title: typeof flags.title === "string" ? flags.title : (prev.title ?? name),
    exam_weight: flags.weight ? Number(flags.weight) : (prev.exam_weight ?? 1),
    is_free: flags.free === true ? true : (prev.is_free ?? false),
  };
  writeJson(metaFile, meta);
  writeJson(path.join(dir, "blocks.json"), blocks);
  log(`✔ ${blocks.length} blocchi → content/generated/${id}/blocks.json (gratis: ${meta.is_free})`);
  blocks.forEach((b) => log(`   - ${b.subtopic_id} (${b.text.length} car.)`));
}
main().catch((e) => die(String(e)));
