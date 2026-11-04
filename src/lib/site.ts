// Dati del sito e del titolare. Tutto ciò che è TODO_GIOVANNI va compilato dopo il parere del commercialista.
export const site = {
  name: "Preparazione TFA Sostegno", // TODO_GIOVANNI: nome definitivo del sito
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  description: "Riassunti, mappe, flashcard, quiz a 5 livelli ed esami simulati per TFA e concorsi sostegno.",
  owner: {
    name: "TODO_GIOVANNI", // ragione sociale / nome e cognome del titolare
    vat: "TODO_GIOVANNI", // P.IVA
    taxCode: "TODO_GIOVANNI",
    address: "TODO_GIOVANNI",
    email: "TODO_GIOVANNI", // email di contatto / privacy
    pec: "TODO_GIOVANNI",
  },
  updated: "2026-11-04",
} as const;
