import type { Metadata } from "next";
import "./globals.css";
import { site } from "@/lib/site";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — quiz, flashcard e simulazioni`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { type: "website", locale: "it_IT", siteName: site.name, title: site.name, description: site.description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
