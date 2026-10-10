// Recuperation des donnees Yahoo Finance cote serveur (Node 18+ : fetch natif).

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchCandles(symbol, range = "3y") {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d&includePrePost=false`;
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(HOSTS[attempt % 2] + path, { headers: HEADERS });
      if (res.ok) {
        const json = await res.json();
        const r = json?.chart?.result?.[0];
        if (!r || !r.timestamp) throw new Error("reponse vide");
        const q = r.indicators.quote[0];
        const out = { symbol, open: [], high: [], low: [], close: [], volume: [], time: [] };
        for (let i = 0; i < r.timestamp.length; i++) {
          if (q.close[i] == null || q.high[i] == null || q.low[i] == null) continue;
          out.time.push(r.timestamp[i]);
          out.open.push(q.open[i] ?? q.close[i]);
          out.high.push(q.high[i]);
          out.low.push(q.low[i]);
          out.close.push(q.close[i]);
          out.volume.push(q.volume[i] ?? 0);
        }
        const m = r.meta || {};
        out.currency = m.currency || "";
        out.name = m.shortName || m.longName || symbol;
        out.exchange = m.fullExchangeName || "";
        return out;
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await sleep(800 * (attempt + 1));
  }
  throw new Error(`${symbol}: ${lastErr?.message || lastErr}`);
}

export async function fetchMany(symbols, concurrency = 4) {
  const queue = symbols.slice();
  const ok = {}, failed = {};
  async function worker() {
    while (queue.length) {
      const s = queue.shift();
      try { ok[s] = await fetchCandles(s); }
      catch (e) { failed[s] = e.message; }
      await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { ok, failed };
}

// Titres d'actualite (Google Actualites, francais)
export async function fetchHeadlines(query, count = 4) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=FR&ceid=FR:fr`;
    const res = await fetch(url, { headers: { "User-Agent": HEADERS["User-Agent"] } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/g;
    let m;
    const tag = (b, n) => {
      const x = b.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`));
      return x ? x[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, "").trim() : "";
    };
    while ((m = re.exec(xml)) && items.length < count) {
      const title = tag(m[1], "title"), link = tag(m[1], "link"), source = tag(m[1], "source");
      if (title && link) items.push({ title: source && title.endsWith(" - " + source) ? title.slice(0, -(source.length + 3)) : title, link, source });
    }
    return items;
  } catch {
    return [];
  }
}
