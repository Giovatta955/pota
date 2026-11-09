import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Riassunto in markdown (GFM: tabelle, liste numerate).
 * Convenzione per i riquadri: un blockquote che inizia con un'etichetta in grassetto
 * ("**Da ricordare**", "**Attenzione**", "**Esempio**", "**Trappola d'esame**") viene colorato.
 */
const CALLOUTS: [RegExp, string][] = [
  [/^(attenzione|trappol)/i, "border-rose-400 bg-rose-50"],
  [/^(esempio|in classe|caso)/i, "border-emerald-400 bg-emerald-50"],
  [/^(da ricordare|ricorda|in sintesi|nota)/i, "border-amber-400 bg-amber-50"],
];

function textOf(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node as { props: { children?: unknown } }).props.children);
  return "";
}

const components: Components = {
  h2: ({ children }) => <h2 className="mt-8 border-b border-slate-200 pb-1 text-xl font-bold text-indigo-900">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-5 text-lg font-semibold text-slate-900">{children}</h3>,
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  table: ({ children }) => <div className="overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
  th: ({ children }) => <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-slate-300 px-2 py-1.5 align-top">{children}</td>,
  blockquote: ({ children }) => {
    const t = textOf(children).trim();
    const cls = CALLOUTS.find(([re]) => re.test(t))?.[1] ?? "border-indigo-300 bg-indigo-50";
    return <blockquote className={`space-y-2 rounded-r-lg border-l-4 px-4 py-3 ${cls}`}>{children}</blockquote>;
  },
};

export function SummaryView({ markdown }: { markdown: string }) {
  return <div className="space-y-3 text-slate-800"><ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{markdown}</ReactMarkdown></div>;
}
