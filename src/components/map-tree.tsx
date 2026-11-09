"use client";
import { createContext, useContext, useState } from "react";
import type { MapNode } from "@/lib/content/schemas";

/**
 * Mappa concettuale orizzontale: nodi a box colorati per ramo, connettori e
 * frasi di collegamento (`rel`) sui rami. Ogni nodo con figli si apre/chiude al tocco.
 */
const PALETTE = [
  { box: "bg-sky-100 border-sky-400 text-sky-950", line: "bg-sky-400", rel: "text-sky-700" },
  { box: "bg-emerald-100 border-emerald-400 text-emerald-950", line: "bg-emerald-400", rel: "text-emerald-700" },
  { box: "bg-amber-100 border-amber-400 text-amber-950", line: "bg-amber-400", rel: "text-amber-700" },
  { box: "bg-rose-100 border-rose-400 text-rose-950", line: "bg-rose-400", rel: "text-rose-700" },
  { box: "bg-violet-100 border-violet-400 text-violet-950", line: "bg-violet-400", rel: "text-violet-700" },
  { box: "bg-teal-100 border-teal-400 text-teal-950", line: "bg-teal-400", rel: "text-teal-700" },
  { box: "bg-orange-100 border-orange-400 text-orange-950", line: "bg-orange-400", rel: "text-orange-700" },
] as const;
type Color = (typeof PALETTE)[number];

const Ctl = createContext<{ gen: number; all: boolean | null }>({ gen: 0, all: null });

function Branch({ node, depth, color }: { node: MapNode; depth: number; color: Color | null }) {
  const ctl = useContext(Ctl);
  const kids = node.children ?? [];
  const [state, setState] = useState<{ gen: number; open: boolean }>({ gen: ctl.gen, open: depth < 2 });
  const open = state.gen === ctl.gen ? state.open : (ctl.all === null ? depth < 2 : ctl.all || depth === 0);
  const toggle = () => setState({ gen: ctl.gen, open: !open });

  const isRoot = depth === 0;
  const boxCls = isRoot
    ? "bg-indigo-700 border-indigo-800 text-white text-base font-bold"
    : `${color!.box} ${depth === 1 ? "font-semibold text-sm" : "text-sm"}`;

  const box = (
    <div className={`relative w-max max-w-[15rem] shrink-0 rounded-xl border-2 px-3 py-2 shadow-sm ${boxCls}`}>
      <div className="leading-snug">{node.title}</div>
      {node.note && <div className="mt-1 text-xs font-normal opacity-80">{node.note}</div>}
      {kids.length > 0 && (
        <button type="button" onClick={toggle} aria-expanded={open} aria-label={open ? `Chiudi ${node.title}` : `Apri ${node.title}`}
          className="absolute -right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-700 shadow">
          {open ? "−" : kids.length}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex items-center">
      {box}
      {kids.length > 0 && open && (
        <div className="ml-6 flex flex-col py-1">
          {kids.map((c, i) => {
            const col = isRoot ? PALETTE[i % PALETTE.length]! : color!;
            const first = i === 0, last = i === kids.length - 1;
            return (
              <div key={i} className="relative flex items-center py-1.5 pl-1">
                {/* tratto verticale che unisce i fratelli */}
                {kids.length > 1 && (
                  <span className={`absolute left-0 w-0.5 ${col.line} ${first ? "top-1/2 bottom-0" : last ? "top-0 bottom-1/2" : "inset-y-0"}`} />
                )}
                <span className={`h-0.5 w-4 shrink-0 ${col.line}`} />
                {c.rel && <span className={`mx-1 max-w-[7rem] shrink-0 text-[11px] italic leading-tight ${col.rel}`}>{c.rel}</span>}
                <span className={`mr-1 h-0.5 w-3 shrink-0 ${col.line}`} />
                <Branch node={c} depth={depth + 1} color={col} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Versione verticale per schermi stretti: rami rientrati con linea colorata e frase di collegamento. */
function VBranch({ node, depth, color }: { node: MapNode; depth: number; color: Color | null }) {
  const ctl = useContext(Ctl);
  const kids = node.children ?? [];
  const [state, setState] = useState<{ gen: number; open: boolean }>({ gen: ctl.gen, open: depth < 1 });
  const open = state.gen === ctl.gen ? state.open : (ctl.all === null ? depth < 1 : ctl.all || depth === 0);
  const isRoot = depth === 0;
  const boxCls = isRoot ? "bg-indigo-700 border-indigo-800 text-white font-bold" : `${color!.box} ${depth === 1 ? "font-semibold" : ""}`;
  return (
    <div>
      <button type="button" disabled={!kids.length} onClick={() => setState({ gen: ctl.gen, open: !open })} aria-expanded={kids.length ? open : undefined}
        className={`flex w-full items-start justify-between gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm shadow-sm ${boxCls}`}>
        <span><span className="block leading-snug">{node.title}</span>{node.note && <span className="mt-0.5 block text-xs font-normal opacity-80">{node.note}</span>}</span>
        {kids.length > 0 && <span className="shrink-0 rounded-full border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700">{open ? "−" : kids.length}</span>}
      </button>
      {kids.length > 0 && open && (
        <div className="ml-3 mt-1 space-y-1">
          {kids.map((c, i) => {
            const col = isRoot ? PALETTE[i % PALETTE.length]! : color!;
            return (
              <div key={i} className={`border-l-2 pl-3 pt-1 ${col.line.replace("bg-", "border-")}`}>
                {c.rel && <div className={`mb-0.5 text-[11px] italic ${col.rel}`}>↳ {c.rel}</div>}
                <VBranch node={c} depth={depth + 1} color={col} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MapTree({ root }: { root: MapNode }) {
  const [ctl, setCtl] = useState<{ gen: number; all: boolean | null }>({ gen: 0, all: null });
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={() => setCtl({ gen: ctl.gen + 1, all: true })} className="rounded-lg border border-slate-300 px-3 py-1.5">Espandi tutto</button>
        <button type="button" onClick={() => setCtl({ gen: ctl.gen + 1, all: false })} className="rounded-lg border border-slate-300 px-3 py-1.5">Comprimi tutto</button>
        <span className="text-slate-500">Tocca un concetto per aprire o chiudere i suoi rami.</span>
      </div>
      <Ctl.Provider value={ctl}>
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 md:block">
          <Branch node={root} depth={0} color={null} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:hidden">
          <VBranch node={root} depth={0} color={null} />
        </div>
      </Ctl.Provider>
    </div>
  );
}
