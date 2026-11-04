import fs from "node:fs";
import path from "node:path";

export const ROOT = process.cwd();
export const SOURCES = path.join(ROOT, "sources");
export const GENERATED = path.join(ROOT, "content", "generated");

export function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}
export function die(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

/** Argomenti CLI: posizionali + --flag / --chiave=valore */
export function parseArgs(argv = process.argv.slice(2)) {
  const pos: string[] = [];
  const flags: Record<string, string | true> = {};
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      flags[k!] = v ?? true;
    } else pos.push(a);
  }
  return { pos, flags };
}

export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}
export function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tmp, file); // scrittura atomica: nessun file a metà se si interrompe
}

export type TopicMeta = { id: string; title: string; exam_weight: number; is_free: boolean };

export function topicDir(topic: string) {
  return path.join(GENERATED, topic);
}
export function loadTopic(topic: string): TopicMeta {
  const f = path.join(topicDir(topic), "topic.json");
  if (!fs.existsSync(f)) die(`Argomento '${topic}' non trovato. Lancia prima: npm run ingest -- ${topic}`);
  return readJson<TopicMeta>(f);
}
/** File dei contenuti generati per sottoargomento (esclude i file di servizio). */
export function contentFiles(topic: string): string[] {
  const dir = topicDir(topic);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !["topic.json", "blocks.json", "rejected.json"].includes(f))
    .map((f) => path.join(dir, f));
}
