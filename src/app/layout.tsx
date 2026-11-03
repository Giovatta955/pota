import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Preparazione TFA Sostegno",
  description: "Riassunti, mappe, flashcard e quiz per TFA e concorsi sostegno.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        {children}
        <footer className="mx-auto max-w-3xl px-4 py-8 text-xs text-slate-500">
          Sito non affiliato a MUR, INDIRE o università. P.IVA: TODO_GIOVANNI
        </footer>
      </body>
    </html>
  );
}
