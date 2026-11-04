"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
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
