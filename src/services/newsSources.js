// src/services/newsSources.js

export const NEWS_SOURCES = [
  {
    id: "lesechos",
    name: "Les Échos",
    type: "rss",
    url: "https://www.lesechos.fr/rss/rss_finance.xml",
  },
  {
    id: "bfm",
    name: "BFM Business",
    type: "rss",
    // RSS BFM (économie) – si celui-ci ne répond pas chez toi, on le changera en 1 ligne
    url: "https://www.bfmtv.com/rss/economie/",
  },
  {
    id: "boursorama",
    name: "Boursorama",
    type: "rss",
    url: "https://www.boursorama.com/rss/actualites/",
  },

  // “Twitter/X” sans API : on génère des liens de recherche (cliquables)
  {
    id: "x",
    name: "Twitter / X",
    type: "x_search",
    queriesByMarket: {
      CAC40: "CAC40 OR Euronext OR Paris Bourse",
      SBF120: "CAC40 OR SBF120 OR Euronext",
      EURONEXT: "Euronext OR Paris Bourse",
      FTSE100: "FTSE100 OR London Stock Exchange OR UK stocks",
      NASDAQ: "NASDAQ OR Nasdaq100 OR Wall Street",
      DOWJONES: "Dow Jones OR Wall Street",
      NIKKEI: "Nikkei OR Japan stocks OR Tokyo Stock Exchange",
      DEFAULT: "stocks OR markets OR trading",
    },
  },
];
