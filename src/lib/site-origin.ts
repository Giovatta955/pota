/** Origine pubblica del sito per i redirect. Su Netlify request.url può essere l'indirizzo interno del deploy
 *  (es. abc123--studiokore.netlify.app): i cookie di sessione starebbero su un host diverso e l'utente risulterebbe non loggato. */
export function siteOrigin(request: Request): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/+$/, "");
}
