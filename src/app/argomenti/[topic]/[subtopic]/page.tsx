import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { canReadSubtopic } from "@/lib/access";
import { mapNodeSchema } from "@/lib/content/schemas";
import { MapTree } from "@/components/map-tree";
import { Flashcards } from "@/components/flashcards";
import { Quiz } from "@/components/quiz";
import { shuffle } from "@/lib/trainer/stats";
import { MediaPlayer } from "@/components/media-player";
import { parseMediaUrl, formatDuration, fileKindFromPath, type ParsedMedia } from "@/lib/media";

type Props = { params: Promise<{ topic: string; subtopic: string }>; searchParams: Promise<{ v?: string; l?: string }> };

const TABS = [
  { id: "riassunto", label: "Riassunto" },
  { id: "mappa", label: "Mappa" },
  { id: "flashcard", label: "Flashcard" },
  { id: "quiz", label: "Quiz" },
  { id: "media", label: "Podcast e video" },
] as const;

export default async function SubtopicPage({ params, searchParams }: Props) {
  const { topic, subtopic } = await params;
  const { v = "riassunto", l } = await searchParams;
  const supabase = await createClient();
  const { data: st } = await supabase.from("subtopics").select("id,title,is_free,topic_id").eq("id", subtopic).eq("topic_id", topic).maybeSingle();
  if (!st) notFound();

  const session = await getSession();
  const allowed = canReadSubtopic({ isFree: !!st.is_free }, session?.viewer ?? null, new Date());
  const base = `/argomenti/${topic}/${subtopic}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href={`/argomenti/${topic}`} className="text-sm text-slate-500">← Sottoargomenti</Link>
      <h1 className="mt-2 text-2xl font-bold">{st.title as string}</h1>
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Sezioni">
        {TABS.map((t) => (
          <Link key={t.id} href={`${base}?v=${t.id}`} aria-current={v === t.id ? "page" : undefined}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${v === t.id ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-600"}`}>{t.label}</Link>
        ))}
      </nav>
      <div className="mt-6">
        {!allowed ? <Locked loggedIn={!!session} /> : <Section v={v} level={l} subtopic={subtopic} base={base} userId={session?.userId ?? null} />}
      </div>
    </main>
  );
}

function Locked({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-6 text-center">
      <p className="font-semibold">Contenuto Premium 🔒</p>
      <p className="mt-1 text-sm text-slate-600">Sblocca tutti gli argomenti, l&apos;allenatore e gli esami simulati.</p>
      <Link href={loggedIn ? "/account" : "/login"} className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">
        {loggedIn ? "Scegli un piano" : "Accedi per iniziare"}
      </Link>
    </div>
  );
}

async function Section({ v, level, subtopic, base, userId }: { v: string; level?: string; subtopic: string; base: string; userId: string | null }) {
  const supabase = await createClient();
  if (v === "mappa") {
    const { data } = await supabase.from("maps").select("tree").eq("subtopic_id", subtopic).maybeSingle();
    const parsed = mapNodeSchema.safeParse(data?.tree);
    return parsed.success ? <MapTree root={parsed.data} /> : <Empty />;
  }
  if (v === "media") {
    const { data: items } = await supabase.from("media").select("id,kind,title,url,path,description,duration_s").eq("subtopic_id", subtopic).order("position").order("created_at");
    const list = (
      await Promise.all(
        (items ?? []).map(async (m) => {
          let parsed: ParsedMedia | null = null;
          if (m.path) {
            const kind = fileKindFromPath(m.path as string);
            // link firmato a tempo: la RLS su Storage verifica l'accesso al sottoargomento
            const { data: signed } = await supabase.storage.from("media").createSignedUrl(m.path as string, 7200);
            if (kind && signed?.signedUrl) parsed = { provider: "file", fileKind: kind, src: signed.signedUrl };
          } else if (m.url) parsed = parseMediaUrl(m.url as string);
          return parsed ? { m, parsed } : null;
        }),
      )
    ).filter((x): x is { m: NonNullable<typeof items>[number]; parsed: ParsedMedia } => !!x);
    if (!list.length) return <Empty />;
    return (
      <ul className="space-y-6">
        {list.map(({ m, parsed }) => (
          <li key={m.id as string} className="space-y-2">
            <h2 className="font-semibold">{m.kind === "podcast" ? "🎧" : "🎬"} {m.title as string} <span className="text-sm font-normal text-slate-500">{formatDuration(m.duration_s as number | null)}</span></h2>
            {m.description ? <p className="text-sm text-slate-600">{m.description as string}</p> : null}
            <MediaPlayer media={parsed} title={m.title as string} />
          </li>
        ))}
      </ul>
    );
  }
  if (v === "flashcard") {
    const { data: cards } = await supabase.from("flashcards").select("id,front,back").eq("subtopic_id", subtopic);
    const today = new Date().toISOString().slice(0, 10);
    let due = cards ?? [];
    if (userId && due.length) {
      const { data: prog } = await supabase.from("flashcard_progress").select("flashcard_id,due_date").eq("user_id", userId).in("flashcard_id", due.map((c) => c.id as string));
      const dueDate = new Map((prog ?? []).map((p) => [p.flashcard_id as string, p.due_date as string]));
      due = due.filter((c) => !dueDate.has(c.id as string) || dueDate.get(c.id as string)! <= today);
    }
    return <Flashcards cards={due.map((c) => ({ id: c.id as string, front: c.front as string, back: c.back as string }))} canSave={!!userId} />;
  }
  if (v === "quiz") {
    const lv = Number(level);
    if (!(lv >= 1 && lv <= 5))
      return (
        <div>
          <p className="mb-3 text-sm text-slate-600">Scegli la difficoltà:</p>
          <div className="grid grid-cols-1 gap-2">
            {["Facile", "Medio", "Difficile", "Molto difficile", "Impossibile"].map((name, i) => (
              <Link key={name} href={`${base}?v=quiz&l=${i + 1}`} className="rounded-lg border border-slate-300 px-4 py-3">L{i + 1} · {name}</Link>
            ))}
          </div>
        </div>
      );
    const { data: qs } = await supabase.from("questions").select("id,level,stem,options").eq("subtopic_id", subtopic).eq("level", lv);
    const picked = shuffle(qs ?? [], Math.random).slice(0, 10);
    return <Quiz questions={picked.map((q) => ({ id: q.id as string, level: q.level as number, stem: q.stem as string, options: q.options as { key: string; text: string }[] }))} />;
  }
  const { data } = await supabase.from("summaries").select("markdown,key_points").eq("subtopic_id", subtopic).maybeSingle();
  if (!data) return <Empty />;
  const points = (data.key_points as string[]) ?? [];
  return (
    <article className="space-y-6">
      <div className="space-y-3 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed"><ReactMarkdown>{data.markdown as string}</ReactMarkdown></div>
      {points.length > 0 && (
        <aside className="rounded-lg bg-indigo-50 p-4"><h2 className="font-semibold">Punti chiave</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{points.map((p, i) => <li key={i}>{p}</li>)}</ul></aside>
      )}
    </article>
  );
}

const Empty = () => <p className="text-sm text-slate-500">Contenuto non ancora disponibile.</p>;
