// src/config/markets.js

// Tu peux compléter les listes de symboles au fur et à mesure.
// Le format des tickers doit être compatible avec ton API (ex : AIR.PA pour Euronext).

export const MARKETS = {
  CAC40: {
    key: "CAC40",
    label: "CAC 40 (Euronext Paris)",
    symbols: [
      "AIR.PA", // Airbus
      "MC.PA",  // LVMH
      "OR.PA",  // L'Oréal
      "SAN.PA", // Sanofi
      "BN.PA",  // Danone
      "ENGI.PA", // Engie
      "SU.PA",  // Schneider Electric
      "TEP.PA", // Teleperformance
      "AI.PA",  // Air Liquide
      "GLE.PA", // Société Générale
      "ACA.PA", // Crédit Agricole
      "CAP.PA", // Capgemini
      // ... complète ici avec le reste du CAC40
    ],
  },

  EURONEXT_FR: {
    key: "EURONEXT_FR",
    label: "Euronext (France - sélection)",
    symbols: [
      "AIR.PA",
      "MC.PA",
      "OR.PA",
      "SAN.PA",
      "BN.PA",
      "SU.PA",
      "CAP.PA",
      "RI.PA",   // Pernod Ricard
      "PUB.PA",  // Publicis
      "VIE.PA",  // Veolia
      "DSY.PA",  // Dassault Systèmes
      "HO.PA",   // Thales
      // ... ajoute tes valeurs préférées Euronext
    ],
  },

  NASDAQ100: {
    key: "NASDAQ100",
    label: "Nasdaq (Tech US - sélection)",
    symbols: [
      "AAPL",
      "MSFT",
      "GOOGL",
      "META",
      "AMZN",
      "TSLA",
      "NVDA",
      "ADBE",
      "INTC",
      "NFLX",
      "AMD",
      "AVGO",
      "CSCO",
      // ... complète avec d'autres valeurs que tu suis
    ],
  },

  DOWJONES30: {
    key: "DOWJONES30",
    label: "Dow Jones (sélection)",
    symbols: [
      "AAPL",
      "MSFT",
      "GS",
      "JPM",
      "DIS",
      "NKE",
      "MCD",
      "KO",
      "PG",
      "V",
      "WMT",
      "CAT",
      // ... ajoute les autres valeurs du Dow si tu veux
    ],
  },

  // Exemple de grand indice type S&P 500 / SBF : tu peux l'étendre progressivement
  LARGE_CAP_US: {
    key: "LARGE_CAP_US",
    label: "Large Caps US (sélection)",
    symbols: [
      "AAPL",
      "MSFT",
      "AMZN",
      "GOOGL",
      "META",
      "TSLA",
      "NVDA",
      "BRK.B",
      "JPM",
      "XOM",
      "CVX",
      "UNH",
      "HD",
      "PFE",
      // ... ajoute au fil du temps (tu n'es pas obligé de mettre 500 d’un coup)
    ],
  },

  // Ta watchlist perso mix CAC/Nasdaq/etc
  CUSTOM_WATCHLIST: {
    key: "CUSTOM_WATCHLIST",
    label: "Ma watchlist perso",
    symbols: [
      "AIR.PA",
      "MC.PA",
      "AAPL",
      "MSFT",
      "TSLA",
      "NVDA",
      "AMZN",
      "META",
      "GOOGL",
      "NIO",
      "BABA",
      "TCEHY",
      // ... mets ici les valeurs que tu surveilles le plus
    ],
  },
};

// Liste simple pour parcourir dans l’UI
export const MARKET_LIST = Object.values(MARKETS);
