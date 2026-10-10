// src/config/markets.js
// Tu peux compléter les listes de symboles au fur et à mesure.
// Le format des tickers doit être compatible avec ton API (ex : AIR.PA pour Euronext, HSBA.L pour Londres).

export const MARKETS = {
  // ✅ On garde CAC 40 AVANT SBF 120 (comme tu veux)
  CAC40: {
    key: "CAC40",
    label: "CAC 40 (Euronext Paris)",
    symbols: [
      "AIR.PA", // Airbus
      "MC.PA", // LVMH
      "OR.PA", // L'Oréal
      "SAN.PA", // Sanofi
      "BN.PA", // Danone
      "ENGI.PA", // Engie
      "SU.PA", // Schneider Electric
      "TEP.PA", // Teleperformance
      "AI.PA", // Air Liquide
      "GLE.PA", // Société Générale
      "ACA.PA", // Crédit Agricole
      "CAP.PA", // Capgemini
      // ... complète ici avec le reste du CAC40
    ],
  },

  // ✅ Ajout SBF 120 (France)
  SBF120: {
    key: "SBF120",
    label: "SBF 120 (France)",
    symbols: [
      "AIR.PA",
      "MC.PA",
      "OR.PA",
      "SAN.PA",
      "BN.PA",
      "ENGI.PA",
      "SU.PA",
      "CAP.PA",
      "RI.PA", // Pernod Ricard
      "PUB.PA", // Publicis
      "VIE.PA", // Veolia
      "DSY.PA", // Dassault Systèmes
      "HO.PA", // Thales
      // ... sélection large caps FR (évolutive)
    ],
  },

  // ✅ Ajout FTSE 100 (UK)
  FTSE100: {
    key: "FTSE100",
    label: "FTSE 100 (UK)",
    symbols: [
      "HSBA.L", // HSBC
      "BP.L",
      "SHEL.L", // Shell
      "AZN.L", // AstraZeneca
      "ULVR.L", // Unilever
      "RIO.L", // Rio Tinto
      "VOD.L", // Vodafone
      "BATS.L", // British American Tobacco
      "GLEN.L", // Glencore
      "BARC.L", // Barclays
      "LLOY.L", // Lloyds
      "NG.L", // National Grid
      // ... complète avec d'autres valeurs FTSE si tu veux
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
      "RI.PA", // Pernod Ricard
      "PUB.PA", // Publicis
      "VIE.PA", // Veolia
      "DSY.PA", // Dassault Systèmes
      "HO.PA", // Thales
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

// Liste simple pour parcourir dans l’UI (l’ordre d’affichage suit l’ordre ci-dessus)
export const MARKET_LIST = Object.values(MARKETS);
