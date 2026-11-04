"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { parseMediaUrl } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";

async function adminClient() {
  const s = await getSession();
  if (!s?.viewer.isAdmin) throw new Error("non autorizzato"); // la RLS applica comunque lo stesso controllo
  return createClient();
}

const reportSchema = z.object({ id: z.string().uuid(), status: z.enum(["resolved", "dismissed"]) });
export async function setReportStatus(formData: FormData) {
  const { id, status } = reportSchema.parse(Object.fromEntries(formData));
  const db = await adminClient();
  await db.from("reports").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

const questionSchema = z.object({
  id: z.string().min(1),
  stem: z.string().trim().min(10).max(1200),
  explanation: z.string().trim().min(20).max(2000),
  active: z.enum(["on"]).optional(),
});
export async function saveQuestion(formData: FormData) {
  const q = questionSchema.parse(Object.fromEntries(formData));
  const db = await adminClient();
  await db.from("questions").update({ stem: q.stem, explanation: q.explanation, active: q.active === "on" }).eq("id", q.id);
  revalidatePath("/admin");
}

// ---------- Gestione argomenti e media (solo admin; la RLS applica lo stesso controllo) ----------
const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "solo minuscole, numeri e trattini").max(80);
const num = (min: number, max: number) => z.coerce.number().min(min).max(max);

const topicSchema = z.object({ id: slug, title: z.string().trim().min(1).max(200), position: num(0, 9999), exam_weight: num(0, 100) });
export async function saveTopic(formData: FormData) {
  const t = topicSchema.parse(Object.fromEntries(formData));
  const db = await adminClient();
  const { error } = await db.from("topics").upsert(t);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/argomenti");
}

const subtopicSchema = topicSchema.extend({ topic_id: slug, is_free: z.enum(["on"]).optional() });
export async function saveSubtopic(formData: FormData) {
  const { is_free, ...st } = subtopicSchema.parse(Object.fromEntries(formData));
  const db = await adminClient();
  const { error } = await db.from("subtopics").upsert({ ...st, is_free: is_free === "on" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/argomenti");
}

const mediaSchema = z.object({
  subtopic_id: z.string().min(1),
  kind: z.enum(["podcast", "video"]),
  title: z.string().trim().min(1).max(200),
  url: z.string().trim().url().refine((u) => parseMediaUrl(u) !== null, "URL non supportato: usa YouTube, Vimeo, Spotify o un file .mp3/.mp4 su Supabase Storage"),
  description: z.string().trim().max(1000).optional(),
  minutes: z.coerce.number().min(0).max(600).optional(),
  position: num(0, 9999).optional(),
});
export async function addMedia(formData: FormData) {
  const m = mediaSchema.parse(Object.fromEntries(formData));
  const db = await adminClient();
  const { error } = await db.from("media").insert({
    subtopic_id: m.subtopic_id, kind: m.kind, title: m.title, url: m.url, description: m.description || null,
    duration_s: m.minutes ? Math.round(m.minutes * 60) : null, position: m.position ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/media");
}
export async function deleteMedia(formData: FormData) {
  const id = z.string().uuid().parse(formData.get("id"));
  const db = await adminClient();
  await db.from("media").delete().eq("id", id);
  revalidatePath("/admin/media");
}
