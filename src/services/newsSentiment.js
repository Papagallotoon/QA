// src/services/newsSentiment.js
// Sentiment simple (rule-based) FR/EN finance.
// Retourne: { label: "positif"|"négatif"|"neutre", score: -5..+5, emoji: "🔥"|"⚠️"|"" }

const POSITIVE_WORDS = [
  // FR
  "hausse", "rebond", "progresse", "grimpe", "gagne", "rallye", "record", "optimisme",
  "soutien", "surprise positive", "accélère", "croissance", "baisse des taux", "détente",
  // EN
  "surge", "rally", "beats", "growth", "optimism", "record high", "upgraded", "cuts rates",
  "easing", "bullish", "strong demand", "outperform",
];

const NEGATIVE_WORDS = [
  // FR
  "baisse", "chute", "plonge", "recul", "crainte", "inquiétude", "alerte", "risque",
  "dégradation", "faillite", "licenciements", "inflation", "tensions", "sanctions",
  "récession", "krach", "avertissement", "profit warning",
  // EN
  "drop", "plunge", "slump", "fear", "warning", "downgrade", "recession", "inflation",
  "tensions", "sanctions", "lawsuit", "crisis", "bearish", "weak demand",
];

// expressions “fortes”
const VERY_POSITIVE = ["explose", "s'envole", "carton", "record", "surge", "soars"];
const VERY_NEGATIVE = ["s'effondre", "krach", "panic", "crash", "bankrupt", "faillite"];

function countHits(text, list) {
  let c = 0;
  for (const w of list) {
    if (text.includes(w)) c += 1;
  }
  return c;
}

export function analyzeNewsSentiment(title = "", snippet = "") {
  const t = `${title} ${snippet}`.toLowerCase();

  let score = 0;

  score += countHits(t, POSITIVE_WORDS);
  score -= countHits(t, NEGATIVE_WORDS);

  // pondération fortes
  score += countHits(t, VERY_POSITIVE) * 2;
  score -= countHits(t, VERY_NEGATIVE) * 2;

  // clamp
  if (score > 5) score = 5;
  if (score < -5) score = -5;

  let label = "neutre";
  let emoji = "";

  if (score >= 2) {
    label = "positif";
    emoji = "🔥";
  } else if (score <= -2) {
    label = "négatif";
    emoji = "⚠️";
  }

  return { label, score, emoji };
}
