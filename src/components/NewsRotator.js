// src/components/NewsRotator.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NEWS_SOURCES } from "../services/newsSources";
import { analyzeNewsSentiment } from "../services/newsSentiment";

// --------- utils
function safeText(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function decodeHtml(s) {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// parsing RSS ultra léger (OK pour la majorité des flux RSS “classiques”)
function parseRss(xmlText) {
  const xml = xmlText || "";
  const items = [];

  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const block of itemBlocks) {
    const title = decodeHtml(safeText((block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || [])[1] ||
      (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1]));

    const link = safeText((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
    const pubDate = safeText((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]);
    const description = decodeHtml(safeText(
      (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || [])[1] ||
      (block.match(/<description>([\s\S]*?)<\/description>/) || [])[1]
    ));

    if (!title || !link) continue;

    items.push({
      title,
      link,
      pubDate,
      description,
    });
  }
  return items;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l’instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  return `il y a ${days} j`;
}

function isBreaking(pubDate) {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return false;
  return (Date.now() - d.getTime()) <= 60 * 60 * 1000; // <= 1h
}

function sourceColor(id) {
  // simple mapping (UX)
  if (id === "lesechos") return "#38bdf8";     // bleu
  if (id === "bfm") return "#fb923c";         // orange
  if (id === "boursorama") return "#22c55e";  // vert
  if (id === "x") return "#a3a3a3";           // gris
  return "#94a3b8";
}

async function fetchRss(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (QuantumAlgoApp)",
      Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
  });
  const text = await res.text();
  return text;
}

// --------- component
export default function NewsRotator({
  title = "Actualités",
  maxVisible = 3,
  rotateEveryMs = 7000,
  onPressMore,
  marketKey = "DEFAULT", // ✅ optionnel : donne le marché actuel (CAC40, FTSE100, NASDAQ...)
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(0);

  const timerRef = useRef(null);

  // cache
  const CACHE_KEY = `news_cache_v3_${marketKey}`;
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // 1) cache
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.ts && Array.isArray(parsed?.items)) {
            const fresh = (Date.now() - parsed.ts) < CACHE_TTL_MS;
            if (fresh && !cancelled) {
              setItems(parsed.items);
              setLoading(false);
            }
          }
        }
      } catch {}

      // 2) fetch
      const combined = [];
      for (const src of NEWS_SOURCES) {
        try {
          if (src.type === "rss") {
            const xml = await fetchRss(src.url);
            const rssItems = parseRss(xml).slice(0, 10);

            for (const it of rssItems) {
              const senti = analyzeNewsSentiment(it.title, it.description);
              combined.push({
                id: `${src.id}:${it.link}`,
                sourceId: src.id,
                sourceName: src.name,
                title: it.title,
                link: it.link,
                pubDate: it.pubDate,
                timeAgo: timeAgo(it.pubDate),
                breaking: isBreaking(it.pubDate),
                sentiment: senti, // {label, score, emoji}
              });
            }
          }

          if (src.type === "x_search") {
            const q = src.queriesByMarket?.[marketKey] || src.queriesByMarket?.DEFAULT;
            const url = `https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query`;
            const senti = { label: "neutre", score: 0, emoji: "" };
            combined.push({
              id: `${src.id}:${url}`,
              sourceId: src.id,
              sourceName: src.name,
              title: `Tendance marché sur X : ${q}`,
              link: url,
              pubDate: "",
              timeAgo: "",
              breaking: false,
              sentiment: senti,
            });
          }
        } catch (e) {
          // si une source échoue, on garde les autres
          // console.log("news source error", src.name, e);
        }
      }

      // dedupe (par lien)
      const seen = new Set();
      const deduped = [];
      for (const it of combined) {
        const key = it.link || it.id;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(it);
      }

      // mix + prendre un volume raisonnable
      const mixed = shuffle(deduped).slice(0, 30);

      if (!cancelled) {
        setItems(mixed);
        setLoading(false);
        setCursor(0);

        try {
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items: mixed }));
        } catch {}
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [CACHE_KEY, marketKey]);

  // rotation
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCursor((c) => c + 1);
    }, rotateEveryMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [rotateEveryMs, items.length]);

  const visible = useMemo(() => {
    if (!items.length) return [];
    const out = [];
    for (let i = 0; i < Math.min(maxVisible, items.length); i++) {
      out.push(items[(cursor + i) % items.length]);
    }
    return out;
  }, [items, cursor, maxVisible]);

  const openLink = async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {}
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          onPress={onPressMore}
          activeOpacity={0.85}
          style={styles.moreBtn}
        >
          <Text style={styles.moreText}>Voir plus</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <Text style={styles.loading}>Chargement des actus…</Text>
      )}

      {!loading && visible.length === 0 && (
        <Text style={styles.empty}>
          Aucune actu disponible (certaines sources peuvent bloquer selon le réseau).
        </Text>
      )}

      {visible.map((it) => {
        const c = sourceColor(it.sourceId);
        const senti = it.sentiment || { label: "neutre", emoji: "" };
        const sentiColor =
          senti.label === "positif" ? "#22c55e" : senti.label === "négatif" ? "#fb7185" : "#94a3b8";
        const badgeText =
          senti.label === "positif" ? "Positif" : senti.label === "négatif" ? "Négatif" : "Neutre";

        return (
          <TouchableOpacity
            key={it.id}
            activeOpacity={0.85}
            onPress={() => openLink(it.link)}
            style={styles.item}
          >
            <View style={styles.itemTopRow}>
              <View style={[styles.sourcePill, { borderColor: c }]}>
                <Text style={[styles.sourceText, { color: c }]} numberOfLines={1}>
                  {it.sourceName}
                </Text>
              </View>

              {it.breaking && (
                <View style={styles.breakingPill}>
                  <Text style={styles.breakingText}>BREAKING</Text>
                </View>
              )}

              <View style={[styles.sentimentPill, { borderColor: sentiColor }]}>
                <Text style={[styles.sentimentText, { color: sentiColor }]}>
                  {senti.emoji ? `${senti.emoji} ` : ""}{badgeText}
                </Text>
              </View>

              {!!it.timeAgo && (
                <Text style={styles.timeAgo}>{it.timeAgo}</Text>
              )}
            </View>

            <Text style={styles.headline} numberOfLines={2}>
              {it.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#020617",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    color: "#f9fafb",
    fontSize: 13,
    fontWeight: "900",
  },
  moreBtn: {
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  moreText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "800",
  },
  loading: {
    color: "#94a3b8",
    fontSize: 12,
  },
  empty: {
    color: "#94a3b8",
    fontSize: 12,
  },

  item: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#0b1220",
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  sourcePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: "900",
  },

  breakingPill: {
    backgroundColor: "#fb7185",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  breakingText: {
    color: "#020617",
    fontSize: 10,
    fontWeight: "900",
  },

  sentimentPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sentimentText: {
    fontSize: 10,
    fontWeight: "900",
  },

  timeAgo: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
  },

  headline: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
});
