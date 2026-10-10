// Recherche de valeurs par nom ou par symbole (endpoints publics Yahoo Finance).

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; QuantumAlgo/1.0)",
  Accept: "application/json",
};

// Deux hotes : si le premier limite le debit, on bascule sur le second.
var HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

var KEEP = { EQUITY: "Action", INDEX: "Indice", ETF: "ETF", MUTUALFUND: "Fonds" };

async function tryHosts(path) {
  var lastErr = null;
  for (var i = 0; i < HOSTS.length; i++) {
    try {
      var res = await fetch(HOSTS[i] + path, { headers: HEADERS });
      if (res.ok) return await res.json();
      lastErr = new Error("Reponse " + res.status);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Recherche indisponible");
}

export async function searchSymbols(query, count) {
  var q = (query || "").trim();
  if (q.length < 1) return [];

  var path = "/v1/finance/search?q=" + encodeURIComponent(q) +
    "&quotesCount=" + (count || 16) + "&newsCount=0&enableFuzzyQuery=true" +
    "&quotesQueryId=tss_match_phrase_query&lang=fr-FR&region=FR";

  var json = await tryHosts(path);
  var rows = (json.quotes || [])
    .filter(function (r) { return r.symbol && KEEP[r.quoteType]; })
    .map(function (r) {
      return {
        symbol: r.symbol,
        name: r.shortname || r.longname || r.symbol,
        exchange: r.exchDisp || r.exchange || "",
        type: KEEP[r.quoteType],
      };
    });

  // Aucun resultat mais la saisie ressemble a un symbole : on la propose telle quelle.
  if (!rows.length && /^[A-Za-z0-9.\-^]{1,12}$/.test(q)) {
    rows.push({ symbol: q.toUpperCase(), name: q.toUpperCase(), exchange: "Symbole direct", type: "Action" });
  }
  return rows;
}

// Indice de reference selon la place de cotation, pour le beta et la force relative.
var SUFFIX_INDEX = {
  ".PA": "^FCHI", ".BR": "^BFX", ".AS": "^AEX", ".LS": "^FCHI",
  ".DE": "^GDAXI", ".F": "^GDAXI", ".MI": "FTSEMIB.MI", ".MC": "^IBEX",
  ".SW": "^SSMI", ".VI": "^ATX", ".L": "^FTSE", ".IR": "^FTSE",
  ".ST": "^OMX", ".OL": "^OSEAX", ".CO": "^OMXC25", ".HE": "^OMXH25",
  ".T": "^N225", ".HK": "^HSI", ".SS": "000001.SS", ".SZ": "399001.SZ",
  ".AX": "^AXJO", ".NZ": "^NZ50", ".TO": "^GSPTSE", ".V": "^GSPTSE",
  ".SA": "^BVSP", ".MX": "^MXX", ".BO": "^BSESN", ".NS": "^NSEI",
  ".KS": "^KS11", ".TW": "^TWII", ".SI": "^STI", ".JO": "^JN0U.JO",
  ".TA": "^TA125.TA", ".IS": "XU100.IS", ".WA": "WIG20.WA",
};

export function referenceIndex(symbol) {
  var s = String(symbol);
  var dot = s.lastIndexOf(".");
  if (dot > 0) {
    var suffix = s.slice(dot);
    if (SUFFIX_INDEX[suffix]) return SUFFIX_INDEX[suffix];
  }
  return "^GSPC";
}
