export const INDICES = [
  { id: "cac", name: "CAC 40", label: "CAC 40", score: 63 },
  { id: "sbf", name: "SBF 120", label: "SBF 120", score: 60 },
  { id: "spx", name: "S&P 500", label: "S&P 500", score: 71 },
  { id: "ndx", name: "NASDAQ", label: "NASDAQ 100", score: 76 },
  { id: "dji", name: "DOW", label: "DOW JONES", score: 52 },
  { id: "dax", name: "DAX", label: "DAX 40", score: 58 },
  { id: "mib", name: "MIB", label: "FTSE MIB", score: 35 },
  { id: "nkx", name: "NIKKEI", label: "NIKKEI 225", score: 40 },
];

export const STOCKS = {
  cac: [
    {
      id: "mc", name: "LVMH", ticker: "MC.PA / CAC 40",
      sectorLabel: "SECTEUR / LUXE",
      sector: "Premier groupe mondial du luxe : mode, maroquinerie, spiritueux, parfums et horlogerie. Environ 40 % du chiffre d'affaires en Asie - la valeur reagit au yuan et au tourisme chinois.",
      price: "642,80 EUR", change: "+0,74 %", score: 78, dir: 1,
      cap: "321 Mds", beta: "1,18", weight: "9,4 %",
      median: "+1,9 %", interval: "-3,4 / +6,1 %", conf: "0,84",
      high: "655", low: "621", sub: "642,80 EUR / Luxe",
      factors: [["Momentum 20 seances", 82], ["Revisions d'analystes", 61], ["Volume relatif", 44], ["Valorisation (PER 24x)", -24]],
    },
    {
      id: "su", name: "Schneider Electric", ticker: "SU.PA / CAC 40",
      sectorLabel: "SECTEUR / ELECTRIFICATION",
      sector: "Gestion de l'energie et automatismes industriels. Expose aux depenses en centres de donnees et a l'electrification des batiments - un cycle porteur mais sensible aux taux longs.",
      price: "228,15 EUR", change: "+0,41 %", score: 68, dir: 1,
      cap: "128 Mds", beta: "1,26", weight: "5,8 %",
      median: "+1,3 %", interval: "-2,8 / +4,9 %", conf: "0,77",
      high: "236", low: "219", sub: "228,15 EUR / Electrification",
      factors: [["Momentum 20 seances", 64], ["Carnet de commandes", 58], ["Volume relatif", 31], ["Sensibilite aux taux", -29]],
    },
    {
      id: "ai", name: "Air Liquide", ticker: "AI.PA / CAC 40",
      sectorLabel: "SECTEUR / GAZ INDUSTRIELS",
      sector: "Gaz industriels et sante, contrats de long terme largement indexes. Profil defensif : peu de momentum, peu de volatilite, forte visibilite sur les marges.",
      price: "176,44 EUR", change: "+0,05 %", score: 52, dir: 1,
      cap: "102 Mds", beta: "0,84", weight: "4,6 %",
      median: "+0,2 %", interval: "-2,1 / +2,6 %", conf: "0,61",
      high: "180", low: "172", sub: "176,44 EUR / Gaz industriels",
      factors: [["Momentum 20 seances", 12], ["Revisions d'analystes", 18], ["Volume relatif", -8], ["Valorisation (PER 26x)", -21]],
    },
    {
      id: "tte", name: "TotalEnergies", ticker: "TTE.PA / CAC 40",
      sectorLabel: "SECTEUR / ENERGIE",
      sector: "Petrole, gaz et electricite bas carbone. La valeur suit le baril et les marges de raffinage ; le repli recent du Brent pese sur les estimations a court terme.",
      price: "57,32 EUR", change: "-0,88 %", score: 71, dir: -1,
      cap: "132 Mds", beta: "0,92", weight: "6,1 %",
      median: "-1,4 %", interval: "-5,2 / +2,0 %", conf: "0,68",
      high: "59", low: "54", sub: "57,32 EUR / Energie",
      factors: [["Baril (Brent 30 j)", -58], ["Marges de raffinage", -41], ["Momentum 20 seances", -22], ["Rendement du dividende", 34]],
    },
  ],
  spx: [
    {
      id: "msft", name: "Microsoft", ticker: "MSFT / S&P 500",
      sectorLabel: "SECTEUR / LOGICIEL & CLOUD",
      sector: "Logiciels d'entreprise, cloud Azure et licences. La croissance du cloud et les investissements en IA dominent les revisions de benefices.",
      price: "512,40 USD", change: "+1,12 %", score: 81, dir: 1,
      cap: "3 810 Mds", beta: "0,94", weight: "7,2 %",
      median: "+2,4 %", interval: "-2,6 / +7,1 %", conf: "0,88",
      high: "528", low: "497", sub: "512,40 USD / Cloud",
      factors: [["Croissance du cloud", 88], ["Revisions d'analystes", 72], ["Momentum 20 seances", 64], ["Valorisation (PER 34x)", -31]],
    },
    {
      id: "jnj", name: "Johnson & Johnson", ticker: "JNJ / S&P 500",
      sectorLabel: "SECTEUR / SANTE",
      sector: "Pharmacie et dispositifs medicaux. Revenus peu cycliques, dividende regulier ; le risque principal reste reglementaire et judiciaire.",
      price: "168,20 USD", change: "+0,08 %", score: 54, dir: 1,
      cap: "405 Mds", beta: "0,58", weight: "1,3 %",
      median: "+0,3 %", interval: "-1,9 / +2,4 %", conf: "0,64",
      high: "172", low: "164", sub: "168,20 USD / Sante",
      factors: [["Pipeline clinique", 28], ["Revisions d'analystes", 14], ["Momentum 20 seances", 6], ["Risque reglementaire", -19]],
    },
    {
      id: "xom", name: "Exxon Mobil", ticker: "XOM / S&P 500",
      sectorLabel: "SECTEUR / ENERGIE",
      sector: "Exploration, production et raffinage. Correlation directe au baril ; le modele anticipe un repli avec la detente des prix du brut.",
      price: "112,64 USD", change: "-1,04 %", score: 66, dir: -1,
      cap: "487 Mds", beta: "0,88", weight: "1,1 %",
      median: "-1,2 %", interval: "-4,8 / +1,9 %", conf: "0,66",
      high: "116", low: "107", sub: "112,64 USD / Energie",
      factors: [["Baril (WTI 30 j)", -54], ["Marges de raffinage", -37], ["Momentum 20 seances", -18], ["Rachats d'actions", 29]],
    },
  ],
};

export function stocksOf(indexId) {
  return STOCKS[indexId] || STOCKS.cac;
}

export function findStock(id) {
  var keys = Object.keys(STOCKS);
  for (var i = 0; i < keys.length; i++) {
    var hit = STOCKS[keys[i]].filter(function (s) { return s.id === id; })[0];
    if (hit) return hit;
  }
  return null;
}
