import Link from "next/link";
import { site } from "@/lib/site";

const LINKS = [
  ["/privacy", "Privacy"], ["/cookie", "Cookie"], ["/termini", "Termini"], ["/recesso", "Recesso"], ["/disclaimer", "Disclaimer"],
] as const;

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 max-w-3xl border-t border-slate-200 px-4 py-8 text-xs text-slate-500">
      <nav aria-label="Pagine legali" className="flex flex-wrap gap-x-4 gap-y-2">
        {LINKS.map(([href, label]) => <Link key={href} href={href} className="underline">{label}</Link>)}
      </nav>
      <p className="mt-4">{site.name} — non affiliato a MUR, INDIRE o università. Contenuti originali, non ufficiali.</p>
      <p className="mt-1">{site.owner.name} · P.IVA {site.owner.vat} · {site.owner.address}</p>
    </footer>
  );
}
