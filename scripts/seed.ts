// Uso: npm run seed   → prepara l'argomento di esempio in content/generated/demo-didattica; poi: npm run import -- demo-didattica
import fs from "node:fs";
import path from "node:path";
import { GENERATED, log, writeJson, readJson } from "./lib/common";
import { subtopicContentSchema } from "../src/lib/content/schemas";

const seed = subtopicContentSchema.parse(readJson(path.join("content", "seed", "esempio.json")));
const dir = path.join(GENERATED, seed.topic_id);
fs.mkdirSync(dir, { recursive: true });
writeJson(path.join(dir, "topic.json"), { id: seed.topic_id, title: "Demo: didattica inclusiva", exam_weight: 1, is_free: true });
writeJson(path.join(dir, `${seed.subtopic_id}.json`), seed);
log(`✔ Seed pronto in content/generated/${seed.topic_id}. Ora: npm run import -- ${seed.topic_id}`);
