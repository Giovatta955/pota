import type { MapNode } from "@/lib/content/schemas";

function Node({ node, depth }: { node: MapNode; depth: number }) {
  const has = !!node.children?.length;
  const label = (
    <>
      <span className="font-medium">{node.title}</span>
      {node.note && <span className="ml-2 text-sm text-slate-500">{node.note}</span>}
    </>
  );
  if (!has) return <li className="py-1 pl-5">{label}</li>;
  return (
    <li>
      <details open={depth < 1} className="group">
        <summary className="cursor-pointer py-1 marker:text-indigo-600">{label}</summary>
        <ul className="ml-3 border-l border-slate-200 pl-2">
          {node.children!.map((c, i) => <Node key={i} node={c} depth={depth + 1} />)}
        </ul>
      </details>
    </li>
  );
}

/** Albero espandibile/comprimibile (usa <details>: accessibile e senza JS). */
export function MapTree({ root }: { root: MapNode }) {
  return <ul className="rounded-lg border border-slate-200 p-3"><Node node={root} depth={0} /></ul>;
}
