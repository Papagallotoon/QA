// Actualites francaises via le flux RSS de Google Actualites.
// Pas de cle API. Renvoie des sources francophones : Les Echos, BFM Bourse,
// Boursier, La Tribune, Zonebourse, Investir...

var RSS = "https://news.google.com/rss/search";

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; QuantumAlgo/1.0)",
  Accept: "application/rss+xml, application/xml, text/xml",
};

function decode(s) {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function tag(block, name) {
  var m = block.match(new RegExp("<" + name + "[^>]*>([\\s\\S]*?)</" + name + ">"));
  return m ? decode(m[1]) : "";
}

function parseRss(xml) {
  var items = [];
  var re = /<item>([\s\S]*?)<\/item>/g;
  var m;
  while ((m = re.exec(xml)) !== null) {
    var block = m[1];
    var rawTitle = tag(block, "title");
    var source = tag(block, "source");
    // Google suffixe le titre par " - Nom du media"
    var title = rawTitle;
    if (source && title.slice(-(source.length + 3)) === " - " + source) {
      title = title.slice(0, -(source.length + 3));
    } else {
      var dash = title.lastIndexOf(" - ");
      if (dash > 25) { source = source || title.slice(dash + 3); title = title.slice(0, dash); }
    }
    var link = tag(block, "link");
    var pub = tag(block, "pubDate");
    var t = pub ? Date.parse(pub) : null;
    if (!title || !link) continue;
    items.push({
      id: tag(block, "guid") || link,
      title: title,
      publisher: source || "",
      link: link,
      time: isNaN(t) ? null : t,
      thumb: null,
    });
  }
  return items;
}

export async function fetchNews(query, count) {
  var url = RSS + "?q=" + encodeURIComponent(query) + "&hl=fr&gl=FR&ceid=FR:fr";
  var res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error("Flux indisponible (" + res.status + ")");
  var xml = await res.text();
  var items = parseRss(xml);
  return items.slice(0, count || 10);
}

// Agrege plusieurs requetes, dedoublonne par titre, trie par date.
export async function fetchNewsMany(queries, perQuery) {
  var all = [];
  var seen = {};
  var results = await Promise.all(queries.map(function (q) {
    return fetchNews(q, perQuery || 4).catch(function () { return []; });
  }));
  for (var i = 0; i < results.length; i++) {
    for (var j = 0; j < results[i].length; j++) {
      var n = results[i][j];
      var key = n.title.slice(0, 60).toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      all.push(n);
    }
  }
  all.sort(function (a, b) { return (b.time || 0) - (a.time || 0); });
  return all;
}

export function timeAgo(ms) {
  if (!ms) return "";
  var diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return "a l'instant";
  if (diff < 3600) return "il y a " + Math.floor(diff / 60) + " min";
  if (diff < 86400) return "il y a " + Math.floor(diff / 3600) + " h";
  var days = Math.floor(diff / 86400);
  if (days === 1) return "hier";
  if (days < 7) return "il y a " + days + " jours";
  var d = new Date(ms);
  return d.getDate() + "/" + (d.getMonth() + 1);
}
