// src/api/marketData.js
// ==========================================
// Données marché pour ton bot Holo
// - Bougies : Yahoo Finance (chart API) via proxy (pour Expo Web)
// - Recherche : auto-complétion LOCALE Europe
// ==========================================

const YAHOO_CHART_BASE =
  "https://query1.finance.yahoo.com/v8/finance/chart/";
const CORS_PROXY = "https://corsproxy.io/?";

function buildProxiedUrl(targetUrl) {
  return `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
}

// ==================================================
// 1) Bougies génériques (range + interval variables)
// ==================================================

export async function fetchCandles(
  symbol,
  { range = "6mo", interval = "1d" } = {}
) {
  if (!symbol || typeof symbol !== "string") {
    throw new Error("Symbole invalide ou manquant.");
  }

  const trimmed = symbol.trim();
  if (!trimmed) {
    throw new Error("Symbole vide après trim.");
  }

  const encodedSymbol = encodeURIComponent(trimmed);
  const targetUrl = `${YAHOO_CHART_BASE}${encodedSymbol}?range=${range}&interval=${interval}`;
  const proxiedUrl = buildProxiedUrl(targetUrl);

  let res;
  try {
    res = await fetch(proxiedUrl);
  } catch (e) {
    console.log("Erreur réseau fetchCandles:", e);
    throw new Error(
      "Impossible de joindre Yahoo Finance (problème réseau ou CORS)."
    );
  }

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} – impossible de récupérer les données Yahoo.`
    );
  }

  const json = await res.json();

  if (
    !json ||
    !json.chart ||
    !json.chart.result ||
    !json.chart.result[0]
  ) {
    throw new Error("Données indisponibles pour ce symbole (Yahoo).");
  }

  const result = json.chart.result[0];
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};

  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const candles = [];

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const open = opens[i];
    const high = highs[i];
    const low = lows[i];
    const close = closes[i];
    const volume = volumes[i];

    if (
      open == null ||
      high == null ||
      low == null ||
      close == null
    ) {
      continue;
    }

    candles.push({
      date: new Date(t * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
    });
  }

  if (!candles.length) {
    throw new Error("Aucune bougie exploitable renvoyée par Yahoo.");
  }

  return candles;
}

// Wrapper pour le scanner (6 mois / 1 jour comme avant)
export async function fetchDailyCandles(symbol) {
  return fetchCandles(symbol, { range: "6mo", interval: "1d" });
}

// ==================================================
// 2) Auto-complétion LOCALE Europe
// ==================================================

const EU_SYMBOLS = [
  // France / CAC40
  {
    symbol: "MC.PA",
    name: "LVMH",
    exchange: "Euronext Paris",
    country: "FR",
  },
  {
    symbol: "OR.PA",
    name: "L'Oréal",
    exchange: "Euronext Paris",
    country: "FR",
  },
  {
    symbol: "AIR.PA",
    name: "Airbus",
    exchange: "Euronext Paris",
    country: "FR",
  },
  {
    symbol: "AI.PA",
    name: "Air Liquide",
    exchange: "Euronext Paris",
    country: "FR",
  },
  {
    symbol: "BNP.PA",
    name: "BNP Paribas",
    exchange: "Euronext Paris",
    country: "FR",
  },
  {
    symbol: "ACA.PA",
    name: "Crédit Agricole",
    exchange: "Euronext Paris",
    country: "FR",
  },
  {
    symbol: "SU.PA",
    name: "Schneider Electric",
    exchange: "Euronext Paris",
    country: "FR",
  },
  {
    symbol: "RI.PA",
    name: "Pernod Ricard",
    exchange: "Euronext Paris",
    country: "FR",
  },
  {
    symbol: "TTE.PA",
    name: "TotalEnergies",
    exchange: "Euronext Paris",
    country: "FR",
  },
  {
    symbol: "SAN.PA",
    name: "Sanofi",
    exchange: "Euronext Paris",
    country: "FR",
  },

  // DAX (DE)
  {
    symbol: "SAP.DE",
    name: "SAP",
    exchange: "XETRA",
    country: "DE",
  },
  {
    symbol: "DTE.DE",
    name: "Deutsche Telekom",
    exchange: "XETRA",
    country: "DE",
  },
  {
    symbol: "ALV.DE",
    name: "Allianz",
    exchange: "XETRA",
    country: "DE",
  },
  {
    symbol: "SIE.DE",
    name: "Siemens",
    exchange: "XETRA",
    country: "DE",
  },

  // FTSE 100 (UK)
  {
    symbol: "ULVR.L",
    name: "Unilever",
    exchange: "London",
    country: "GB",
  },
  {
    symbol: "HSBA.L",
    name: "HSBC",
    exchange: "London",
    country: "GB",
  },
  {
    symbol: "BP.L",
    name: "BP",
    exchange: "London",
    country: "GB",
  },
  {
    symbol: "AZN.L",
    name: "AstraZeneca",
    exchange: "London",
    country: "GB",
  },

  // AEX (NL)
  {
    symbol: "ASML.AS",
    name: "ASML",
    exchange: "Euronext Amsterdam",
    country: "NL",
  },
  {
    symbol: "PHIA.AS",
    name: "Philips",
    exchange: "Euronext Amsterdam",
    country: "NL",
  },

  // BEL20 (BE)
  {
    symbol: "ABI.BR",
    name: "AB InBev",
    exchange: "Euronext Brussels",
    country: "BE",
  },
  {
    symbol: "KBC.BR",
    name: "KBC Group",
    exchange: "Euronext Brussels",
    country: "BE",
  },

  // SMI (CH)
  {
    symbol: "NESN.SW",
    name: "Nestlé",
    exchange: "SIX Swiss",
    country: "CH",
  },
  {
    symbol: "ROG.SW",
    name: "Roche",
    exchange: "SIX Swiss",
    country: "CH",
  },

  // IBEX (ES)
  {
    symbol: "ITX.MC",
    name: "Inditex",
    exchange: "Bolsa de Madrid",
    country: "ES",
  },
  {
    symbol: "SAN.MC",
    name: "Banco Santander",
    exchange: "Bolsa de Madrid",
    country: "ES",
  },

  // FTSE MIB (IT)
  {
    symbol: "ENI.MI",
    name: "Eni",
    exchange: "Borsa Italiana",
    country: "IT",
  },
  {
    symbol: "ISP.MI",
    name: "Intesa Sanpaolo",
    exchange: "Borsa Italiana",
    country: "IT",
  },
];

// ==================================================
// 3) Fonction de RECHERCHE locale
// ==================================================

export async function searchSymbols(query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const results = EU_SYMBOLS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(trimmed) ||
      s.name.toLowerCase().includes(trimmed)
  );

  return results.slice(0, 30);
}
