// Prezzi e parametri configurabili: niente valori hardcoded sparsi nel codice.
export const config = {
  prices: {
    monthlyEur: 9.9, // TODO_GIOVANNI: conferma prezzo
    passEur: 39, // TODO_GIOVANNI: conferma prezzo
    passValidUntil: "TODO_GIOVANNI", // data del concorso
  },
  exam: {
    minQuestions: 30,
    maxQuestions: 50,
    levelMix: [0.2, 0.3, 0.3, 0.15, 0.05], // L1..L5
  },
} as const;
