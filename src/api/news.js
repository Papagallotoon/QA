// src/api/news.js
// Flux RSS (sans API payante) : Reuters, Les Échos, Le Figaro
import AsyncStorage from "@react-native-async-storage/async-storage";
import { XMLParser } from "fast-xml-parser";

const FEEDS = [
  { name: "Reuters", url: "https://feeds.reuters.com/reuters/businessNews" },
  { name: "Les Échos", url: "https://www.lesechos.fr/rss/rss_economie.xml" },
  { name: "Le Figaro", url: "https://www.lefigaro.fr/rss/figaro_economie.xml" },
];

const CACHE_KEY = "qa_news_cache_v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function safeArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function toMillis(d) {
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : 0;
}

function guessCategory(title) {
  const t = String(title || "").toLowerCase();

  // CRYPTO
  if (
    t.includes("bitcoin") ||
    t.includes("btc") ||
    t.includes("ethereum") ||
    t.includes("eth") ||
    t.includes("crypto") ||
    t.includes("blockchain")
  ) {
    return "CRYPTO";
  }

  // MACRO
  if (
    t.includes("inflation") ||
    t.includes("taux") ||
    t.includes("banque centrale") ||
    t.includes("bce") ||
    t.includes("fed") ||
    t.includes("pib") ||
    t.includes("croissance") ||
    t.includes("chômage") ||
    t.includes("dollar") ||
    t.includes("euro")
  ) {
    return "MACRO";
  }

  // ACTIONS / MARCHÉS
  if (
    t.includes("bourse") ||
    t.includes("actions") ||
    t.includes("wall street") ||
    t.includes("nasdaq") ||
    t.includes("cac") ||
    t.includes("dax") ||
    t.includes("dow") ||
    t.includes("s&p") ||
    t.includes("résultats") ||
    t.includes("dividende")
  ) {
    return "ACTIONS";
  }

  return "ALL";
}

function normalizeLink(it) {
  // RSS classique
  const link1 = it?.link?.["#text"] || it?.link;
  if (typeof link1 === "string") return link1;

  // Atom
  const link2 = it?.link?.["@_href"] || it?.link?.href;
  if (typeof link2 === "string") return link2;

  // fallback
  const guid = it?.guid?.["#text"] || it?.guid;
  if (typeof guid === "string") return guid;
  return "";
}

async function readCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || !Array.isArray(parsed?.items)) return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
}

async function writeCache(items) {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), items })
    );
  } catch {
    // ignore
  }
}

async function fetchWithHeaders(url) {
  // Certains flux RSS refusent les requêtes "sans User-Agent".
  const res = await fetch(url, {
    headers: {
      Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
      "User-Agent": "Mozilla/5.0 (QuantumAlgo Mobile)",
    },
  });

  if (!res.ok) {
    const msg = `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return res.text();
}

export async function fetchNews({ category = "ALL", force = false } = {}) {
  if (!force) {
    const cached = await readCache();
    if (cached?.length) {
      return category === "ALL" ? cached : cached.filter((x) => x.category === category);
    }
  }

  const parser = new XMLParser({ ignoreAttributes: false });
  const all = [];

  for (const feed of FEEDS) {
    try {
      const text = await fetchWithHeaders(feed.url);
      const xml = parser.parse(text);

      const channel = xml?.rss?.channel || xml?.feed || xml?.channel;
      const rawItems = safeArray(channel?.item || channel?.entry);

      rawItems.forEach((it) => {
        const titleText = it?.title?.["#text"] || it?.title || "";
        const link = normalizeLink(it);
        const pub = it?.pubDate || it?.published || it?.updated || "";

        const title = String(titleText).trim();
        const url = String(link).trim();
        if (!title || !url) return;

        const cat = guessCategory(title);
        all.push({
          title,
          link: url,
          source: feed.name,
          dateMs: toMillis(pub),
          category: cat,
        });
      });
    } catch {
      // ignore si un feed est KO
    }
  }

  // de-dup + tri
  const unique = new Map();
  all.forEach((x) => {
    const key = `${x.source}::${x.link}`;
    if (!unique.has(key)) unique.set(key, x);
  });
  const sorted = Array.from(unique.values()).sort(
    (a, b) => (b.dateMs || 0) - (a.dateMs || 0)
  );

  // Si aucun flux n'a répondu, on remonte une erreur (plutôt qu'un "vide" ambigu)
  if (!sorted.length) {
    throw new Error("No RSS items");
  }

  // cache la version ALL pour toutes catégories
  await writeCache(sorted.slice(0, 80));

  const final = sorted.slice(0, 80);
  return category === "ALL" ? final : final.filter((x) => x.category === category);
}
