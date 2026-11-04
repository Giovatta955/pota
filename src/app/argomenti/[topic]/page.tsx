import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ topic: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("topics").select("title").eq("id", topic).maybeSingle();
  if (!data) return {};
  const title = `${data.title} — riassunto, mappa, flashcard e quiz`;
  return { title, description: `Prepara ${data.title} per TFA e concorsi sostegno: riassunto, mappa concettuale, flashcard e quiz a 5 livelli.`, openGraph: { title } };
}

export default async function TopicPage({ params }: Props) {
  const { topic } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase.from("topics").select("id,title").eq("id", topic).maybeSingle();
  if (!t) notFound();
  const { data: subs } = await supabase.from("subtopics").select("id,title,is_free").eq("topic_id", topic).order("position");
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t.title as string}</h1>
      <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200">
        {(subs ?? []).map((s) => (
          <li key={s.id as string}>
            <Link href={`/argomenti/${topic}/${s.id}`} className="flex items-center justify-between px-4 py-3">
              <span>{s.title as string}</span>
              <span className={`text-xs ${s.is_free ? "text-emerald-700" : "text-slate-500"}`}>{s.is_free ? "Gratis" : "🔒 Premium"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
