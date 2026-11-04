import Link from "next/link";
import { site } from "@/lib/site";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-slate-500">← Home</Link>
      <h1 className="mt-2 text-2xl font-bold">{title}</h1>
      <p role="note" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        BOZZA da far validare (TODO_GIOVANNI): testo di partenza, non è consulenza legale. Aggiornato al {site.updated}.
      </p>
      <div className="mt-6 space-y-4 leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </main>
  );
}
