// Acces aux donnees de marche via l'endpoint public de Yahoo Finance.
// Aucune cle API. A utiliser dans le respect des conditions de Yahoo.

var HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; QuantumAlgo/1.0)",
  Accept: "application/json",
};

export async function fetchCandles(symbol, range, interval) {
  var path = "/v8/finance/chart/" + encodeURIComponent(symbol) +
    "?range=" + (range || "1y") +
    "&interval=" + (interval || "1d") +
    "&includePrePost=false";

  // deux hotes et une nouvelle tentative : Yahoo limite parfois le debit
  var json = null, lastErr = null;
  for (var attempt = 0; attempt < 3 && !json; attempt++) {
    try {
      var res = await fetch(HOSTS[attempt % 2] + path, { headers: HEADERS });
      if (res.ok) json = await res.json();
      else lastErr = new Error("Yahoo " + res.status + " sur " + symbol);
    } catch (e) { lastErr = e; }
    if (!json && attempt < 2) await new Promise(function (r) { setTimeout(r, 400 * (attempt + 1)); });
  }
  if (!json) throw lastErr || new Error("Yahoo indisponible pour " + symbol);
  var r = json && json.chart && json.chart.result && json.chart.result[0];
  if (!r || !r.timestamp || !r.indicators) throw new Error("Reponse vide pour " + symbol);

  var q = r.indicators.quote[0];
  var meta = r.meta || {};
  var out = { open: [], high: [], low: [], close: [], volume: [], time: [] };

  for (var i = 0; i < r.timestamp.length; i++) {
    if (q.close[i] == null || q.high[i] == null || q.low[i] == null) continue;
    out.time.push(r.timestamp[i]);
    out.open.push(q.open[i] == null ? q.close[i] : q.open[i]);
    out.high.push(q.high[i]);
    out.low.push(q.low[i]);
    out.close.push(q.close[i]);
    out.volume.push(q.volume[i] == null ? 0 : q.volume[i]);
  }

  out.symbol = symbol;
  out.currency = meta.currency || "";
  out.name = meta.shortName || meta.longName || symbol;
  out.exchange = meta.fullExchangeName || "";
  out.previousClose = meta.chartPreviousClose;
  out.price = meta.regularMarketPrice != null ? meta.regularMarketPrice : out.close[out.close.length - 1];
  out.marketState = meta.marketState || "";
  return out;
}

// Recupere plusieurs symboles avec une limite de parallelisme,
// pour ne pas saturer le reseau du telephone.
export async function fetchMany(symbols, range, interval, concurrency) {
  var limit = concurrency || 4;
  var results = {};
  var queue = symbols.slice();

  async function worker() {
    while (queue.length) {
      var sym = queue.shift();
      try {
        results[sym] = await fetchCandles(sym, range, interval);
      } catch (e) {
        results[sym] = { error: e.message || String(e), symbol: sym };
      }
    }
  }

  var workers = [];
  for (var i = 0; i < Math.min(limit, symbols.length); i++) workers.push(worker());
  await Promise.all(workers);
  return results;
}
