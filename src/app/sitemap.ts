import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const fixed = ["", "/login", "/privacy", "/cookie", "/termini", "/recesso", "/disclaimer"].map((p) => ({ url: `${base}${p}` }));
  const db = createPublicClient();
  if (!db) return fixed;
  const [{ data: topics }, { data: subs }] = await Promise.all([
    db.from("topics").select("id"),
    db.from("subtopics").select("id,topic_id"),
  ]);
  return [
    ...fixed,
    ...(topics ?? []).map((t) => ({ url: `${base}/argomenti/${t.id}` })),
    ...(subs ?? []).map((s) => ({ url: `${base}/argomenti/${s.topic_id}/${s.id}` })),
  ];
}
