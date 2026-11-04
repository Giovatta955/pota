// Uso: npm run generate -- <argomento> [--dry-run] [--yes] [--force] [--only=<subtopic_id>] [--per-level=4]
// Idempotente e riprendibile: salta i sottoargomenti già generati (a meno di --force).
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { mapNodeSchema, subtopicContentSchema, type SubtopicContent } from "../src/lib/content/schemas";
import { approxTokens, buildQuestion, estimateCostUsd, type Block } from "../src/lib/content/pipeline";
import { topicDir, loadTopic, log, die, parseArgs, readJson, writeJson } from "./lib/common";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const EST_OUT_TOKENS = 9000; // stima prudente per sottoargomento

const RUBRICA = `Rubrica dei livelli:
L1 Facile: definizioni e riconoscimento.
L2 Medio: comprensione e collegamenti base.
L3 Difficile: applicazione a casi concreti.
L4 Molto difficile: casi complessi, distrattori insidiosi, eccezioni.
L5 Impossibile: dettagli normativi fini, casi limite, ragionamenti a più passaggi.`;

const SYSTEM = `Sei un autore di materiale di studio per le prove TFA e i concorsi della scuola (sostegno), in italiano.
REGOLE OBBLIGATORIE:
- RISCRIVI tutto con parole originali. Non copiare passaggi dalla fonte: niente sequenze di 8+ parole identiche. Non citare testualmente.
- Usa SOLO informazioni presenti nel testo fornito (puoi riorganizzarle). Non inventare norme, articoli o date. Se la fonte non indica un riferimento, metti reference = null.
- Ogni domanda ha UNA sola risposta corretta e 3 distrattori plausibili, di lunghezza simile. Vietato "tutte/nessuna delle precedenti".
- La spiegazione dice perché la risposta è giusta E perché le altre sono sbagliate.
- Domande tutte diverse tra loro (niente duplicati o varianti banali).
${RUBRICA}
Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, senza blocchi di codice.`;

const genSchema = z.object({
  summary: z.object({ markdown: z.string().min(50), key_points: z.array(z.string().min(1)).min(3).max(12) }),
  map: mapNodeSchema,
  flashcards: z.array(z.object({ front: z.string().min(3), back: z.string().min(1) })).min(5),
  questions: z.array(
    z.object({
      level: z.number().int().min(1).max(5),
      stem: z.string().min(10),
      correct_option: z.string().min(1),
      wrong_options: z.array(z.string().min(1)).length(3),
      explanation: z.string().min(20),
      reference: z.string().nullable().optional(),
    }),
  ),
});

function userPrompt(b: Block, perLevel: number) {
  return `Sottoargomento: "${b.title}"

Produci un JSON con questa forma:
{
  "summary": { "markdown": "riassunto chiaro in markdown (150-400 parole)", "key_points": ["3-8 punti chiave"] },
  "map": { "title": "...", "note": "opzionale", "children": [ { "title": "...", "children": [...] } ] },   // albero a 2-4 livelli
  "flashcards": [ { "front": "domanda breve", "back": "risposta breve" } ],                                // 8-15 carte
  "questions": [ { "level": 1, "stem": "...", "correct_option": "testo giusta", "wrong_options": ["..","..",".."], "explanation": "...", "reference": null } ]
}
Genera esattamente ${perLevel} domande per OGNUNO dei 5 livelli (totale ${perLevel * 5}).

TESTO SORGENTE (da rielaborare, non copiare):
"""
${b.text}
"""`;
}

function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

async function generateOne(client: Anthropic, topicId: string, b: Block, perLevel: number): Promise<SubtopicContent> {
  let lastErr = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt(b, perLevel) + (lastErr ? `\n\nTentativo precedente non valido: ${lastErr}. Correggi.` : "") }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new Error("rifiuto del modello (safety)");
    const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    try {
      const g = genSchema.parse(parseJson(text));
      const counters: Record<number, number> = {};
      const questions = g.questions.map((q) => {
        counters[q.level] = (counters[q.level] ?? 0) + 1;
        return buildQuestion(q, { topicId, subtopicId: b.subtopic_id, index: counters[q.level]! });
      });
      const content: SubtopicContent = {
        topic_id: topicId,
        subtopic_id: b.subtopic_id,
        summary: { subtopic_id: b.subtopic_id, ...g.summary },
        map: g.map,
        flashcards: g.flashcards.map((f, i) => ({ id: `${b.subtopic_id}-fc-${i + 1}`, subtopic_id: b.subtopic_id, ...f })),
        questions,
      };
      return subtopicContentSchema.parse(content);
    } catch (e) {
      lastErr = e instanceof Error ? e.message.slice(0, 400) : String(e);
      log(`   tentativo ${attempt} non valido: ${lastErr.slice(0, 120)}`);
    }
  }
  throw new Error(`generazione fallita dopo 3 tentativi: ${lastErr}`);
}

async function main() {
  const { pos, flags } = parseArgs();
  const name = pos[0];
  if (!name) die("Uso: npm run generate -- <argomento> [--dry-run] [--yes] [--force] [--only=id] [--per-level=4]");
  const topic = loadTopic(name);
  const dir = topicDir(topic.id);
  const blocks = readJson<Block[]>(path.join(dir, "blocks.json"));
  const perLevel = flags["per-level"] ? Number(flags["per-level"]) : 4;
  const only = typeof flags.only === "string" ? flags.only : null;

  const todo = blocks.filter((b) => (!only || b.subtopic_id === only) && (flags.force || !fs.existsSync(path.join(dir, `${b.subtopic_id}.json`))));
  const skipped = blocks.length - todo.length;

  const inTok = todo.reduce((s, b) => s + approxTokens(b.text.length + SYSTEM.length + 800), 0);
  const outTok = todo.length * EST_OUT_TOKENS * (perLevel / 4);
  const cost = estimateCostUsd(MODEL, inTok, outTok);
  log(`Modello: ${MODEL} | da generare: ${todo.length} (già fatti: ${skipped}) | ${perLevel * 5} domande/sottoargomento`);
  log(`Stima token: ~${inTok} in / ~${Math.round(outTok)} out → ${cost === null ? "costo non stimabile (modello sconosciuto)" : `~$${cost.toFixed(2)}`} (stima grossolana)`);

  if (!todo.length) return log("Niente da fare.");
  if (flags["dry-run"]) return log("--dry-run: nessuna chiamata API.");
  if (!process.env.ANTHROPIC_API_KEY) die("ANTHROPIC_API_KEY mancante (vedi .env.example)");
  if (!flags.yes) die("Controlla la stima sopra e rilancia con --yes per procedere.");

  const client = new Anthropic();
  let ok = 0;
  for (const b of todo) {
    log(`→ ${b.subtopic_id}`);
    try {
      const content = await generateOne(client, topic.id, b, perLevel);
      writeJson(path.join(dir, `${b.subtopic_id}.json`), content); // salvataggio immediato = riprendibile
      ok++;
      log(`   ✔ ${content.questions.length} domande, ${content.flashcards.length} flashcard`);
    } catch (e) {
      log(`   ✖ ${e instanceof Error ? e.message : e} — salto, rilancia per riprovare`);
    }
  }
  log(`Fatto: ${ok}/${todo.length}. Prossimo passo: npm run validate -- ${topic.id}`);
}
main().catch((e) => die(String(e)));
