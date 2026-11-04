// Funzioni pure della pipeline contenuti (testabili, senza I/O).
import { createHash } from "node:crypto";
import type { Question } from "./schemas";

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type Block = { subtopic_id: string; title: string; text: string; source_file: string };

/** Divide un testo in blocchi per intestazioni markdown (#, ##); se mancano, in blocchi di ~maxChars. */
export function splitIntoBlocks(
  text: string,
  opts: { topicId: string; sourceFile: string; maxChars?: number; minChars?: number },
): Block[] {
  const maxChars = opts.maxChars ?? 8000;
  const minChars = opts.minChars ?? 300;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sections: { title: string; body: string[] }[] = [];
  let cur: { title: string; body: string[] } | null = null;
  for (const line of lines) {
    const m = /^#{1,2}\s+(.+?)\s*$/.exec(line);
    if (m && m[1]) {
      cur = { title: m[1], body: [] };
      sections.push(cur);
    } else {
      if (!cur) {
        cur = { title: "Introduzione", body: [] };
        sections.push(cur);
      }
      cur.body.push(line);
    }
  }
  const out: Block[] = [];
  const used = new Set<string>();
  const push = (title: string, body: string) => {
    let id = `${opts.topicId}-${slugify(title) || "blocco"}`;
    for (let i = 2; used.has(id); i++) id = `${opts.topicId}-${slugify(title)}-${i}`;
    used.add(id);
    out.push({ subtopic_id: id, title, text: body.trim(), source_file: opts.sourceFile });
  };
  for (const s of sections) {
    const body = s.body.join("\n").trim();
    if (body.length < minChars) continue;
    if (body.length <= maxChars) {
      push(s.title, body);
      continue;
    }
    // sezione troppo lunga: spezza per paragrafi
    const paras = body.split(/\n{2,}/);
    let buf = "";
    let part = 1;
    for (const p of paras) {
      if (buf && buf.length + p.length > maxChars) {
        push(`${s.title} (parte ${part++})`, buf);
        buf = "";
      }
      buf += (buf ? "\n\n" : "") + p;
    }
    if (buf.trim().length >= minChars) push(part > 1 ? `${s.title} (parte ${part})` : s.title, buf);
  }
  return out;
}

// ---------- RNG deterministico (shuffle opzioni riproducibile) ----------
function seeded(seed: string): () => number {
  let h = createHash("sha256").update(seed).digest().readUInt32LE(0);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type RawQuestion = {
  level: number;
  stem: string;
  correct_option: string; // testo dell'opzione giusta
  wrong_options: string[]; // 3 distrattori
  explanation: string;
  reference?: string | null;
};

/** Costruisce la domanda finale: mescola le opzioni in modo deterministico, assegna id e status=draft. */
export function buildQuestion(raw: RawQuestion, ctx: { topicId: string; subtopicId: string; index: number }): Question {
  const id = `${ctx.subtopicId}-L${raw.level}-${ctx.index}`;
  const all = [raw.correct_option, ...raw.wrong_options];
  const rnd = seeded(id);
  const order = all.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const keys = ["A", "B", "C", "D"] as const;
  const options = order.map((src, pos) => ({ key: keys[pos]!, text: all[src]!.trim() }));
  const correct = keys[order.indexOf(0)]!;
  return {
    id,
    topic_id: ctx.topicId,
    subtopic_id: ctx.subtopicId,
    level: raw.level,
    stem: raw.stem.trim(),
    options,
    correct,
    explanation: raw.explanation.trim(),
    reference: raw.reference?.trim() || null,
    source_kind: "original",
    status: "draft",
  };
}

// ---------- Validazione di insieme ----------
export type Issue = { severity: "error" | "warn"; id?: string; message: string };

const STOP = new Set("di a da in con su per tra fra il lo la i gli le un uno una e è che del della dei delle al alla ai alle nel nella sono non si come più o ma se".split(" "));
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}
export function jaccard(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Cerca sequenze di `n` parole identiche tra testo generato e sorgente (copia letterale). */
export function longestSharedRun(generated: string, source: string, n = 12): boolean {
  const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const g = words(generated);
  if (g.length < n) return false;
  const src = words(source);
  const shingles = new Set<string>();
  for (let i = 0; i + n <= src.length; i++) shingles.add(src.slice(i, i + n).join(" "));
  for (let i = 0; i + n <= g.length; i++) if (shingles.has(g.slice(i, i + n).join(" "))) return true;
  return false;
}

export function checkQuestionSet(
  qs: Question[],
  opts: { nearDuplicate?: number; sourceText?: string } = {},
): Issue[] {
  const issues: Issue[] = [];
  const thr = opts.nearDuplicate ?? 0.8;
  const ids = new Set<string>();
  for (const q of qs) {
    if (ids.has(q.id)) issues.push({ severity: "error", id: q.id, message: "id duplicato" });
    ids.add(q.id);
    if (q.stem.length < 20) issues.push({ severity: "warn", id: q.id, message: "enunciato molto corto" });
    const lens = q.options.map((o) => o.text.length);
    const correctLen = q.options.find((o) => o.key === q.correct)!.text.length;
    if (correctLen === Math.max(...lens) && correctLen > 2 * (lens.reduce((a, b) => a + b, 0) / 4))
      issues.push({ severity: "warn", id: q.id, message: "la risposta corretta è molto più lunga delle altre" });
    if (q.options.some((o) => /tutte le precedenti|nessuna delle precedenti|tutte le altre/i.test(o.text)))
      issues.push({ severity: "error", id: q.id, message: "opzione 'tutte/nessuna delle precedenti' vietata" });
    if (opts.sourceText) {
      const full = [q.stem, q.explanation, ...q.options.map((o) => o.text)].join(" ");
      if (longestSharedRun(full, opts.sourceText))
        issues.push({ severity: "error", id: q.id, message: "testo copiato dalla fonte (≥12 parole identiche)" });
    }
  }
  for (let i = 0; i < qs.length; i++)
    for (let j = i + 1; j < qs.length; j++) {
      const s = jaccard(qs[i]!.stem, qs[j]!.stem);
      if (s >= thr) issues.push({ severity: "error", id: qs[i]!.id, message: `quasi-duplicato di ${qs[j]!.id} (${s.toFixed(2)})` });
    }
  if (qs.length >= 20) {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const q of qs) counts[q.correct]!++;
    for (const [k, c] of Object.entries(counts)) {
      const share = c / qs.length;
      if (share < 0.12 || share > 0.4)
        issues.push({ severity: "warn", message: `distribuzione lettere sbilanciata: ${k}=${(share * 100).toFixed(0)}%` });
    }
  }
  const perLevel = [1, 2, 3, 4, 5].map((l) => qs.filter((q) => q.level === l).length);
  if (qs.length && (Math.min(...perLevel) === 0 || Math.max(...perLevel) - Math.min(...perLevel) > 2))
    issues.push({ severity: "warn", message: `livelli non bilanciati: ${perLevel.join("/")}` });
  return issues;
}

// ---------- Stima costi ----------
export const PRICING_PER_MTOK: Record<string, { in: number; out: number }> = {
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-opus-5-5": { in: 4, out: 20 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5 },
};
export function estimateCostUsd(model: string, inTokens: number, outTokens: number): number | null {
  const p = PRICING_PER_MTOK[model];
  return p ? (inTokens * p.in + outTokens * p.out) / 1e6 : null;
}
export const approxTokens = (chars: number) => Math.ceil(chars / 3.2);
