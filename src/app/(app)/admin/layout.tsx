import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  if (!s.viewer.isAdmin) notFound();
  return (
    <div>
      <nav aria-label="Admin" className="mx-auto flex max-w-3xl gap-4 overflow-x-auto px-4 pt-4 text-sm font-medium">
        <Link href="/admin">Segnalazioni</Link>
        <Link href="/admin/argomenti">Argomenti</Link>
        <Link href="/admin/media">Podcast e video</Link>
      </nav>
      {children}
    </div>
  );
}
