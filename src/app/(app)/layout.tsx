import Link from "next/link";
import { requireSession } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/allenatore", label: "Allenatore" },
  { href: "/esame", label: "Esame" },
  { href: "/account", label: "Account" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession(); // guardia lato server: niente accesso senza login
  return (
    <div className="pb-20 sm:pb-0">
      <header className="hidden border-b border-slate-200 sm:block">
        <nav className="mx-auto flex max-w-3xl gap-6 px-4 py-3 text-sm font-medium">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-indigo-700">{n.label}</Link>)}
        </nav>
      </header>
      {children}
      <nav aria-label="Navigazione" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-slate-200 bg-white text-xs sm:hidden">
        {NAV.map((n) => <Link key={n.href} href={n.href} className="py-4 text-center font-medium">{n.label}</Link>)}
      </nav>
    </div>
  );
}
