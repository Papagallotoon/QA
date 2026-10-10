import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NEWS_SOURCES } from "../services/newsSources";
import { analyzeNewsSentiment } from "../services/newsSentiment";
import MiniDisclaimer from "../components/MiniDisclaimer";

function decodeHtml(s) {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
function safeText(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}
function parseRss(xmlText) {
  const xml = xmlText || "";
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const block of itemBlocks) {
    const title = decodeHtml(
      safeText(
        (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || [])[1] ||
          (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1]
      )
    );
    const link = safeText((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
    const pubDate = safeText((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1]);
    const description = decodeHtml(
      safeText(
        (block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || [])[1] ||
          (block.match(/<description>([\s\S]*?)<\/description>/) || [])[1]
      )
    );
    if (!title || !link) continue;
    items.push({ title, link, pubDate, description });
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
function sourceColor(id) {
  if (id === "lesechos") return "#38bdf8";
  if (id === "bfm") return "#fb923c";
  if (id === "boursorama") return "#22c55e";
  if (id === "figaro") return "#f472b6";
  if (id === "x") return "#a3a3a3";
  return "#94a3b8";
}
async function fetchRss(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (QuantumAlgoApp)",
      Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
  });
  return await res.text();
}

const TAB_FILTERS = {
  Tout: () => true,
  Actions: (t) =>
    /action|actions|bourse|wall street|nasdaq|dow|ftse|cac|sbf|valeur|titre|equity|stock/i.test(t),
  Macro: (t) =>
    /inflation|taux|banque centrale|fed|bce|croissance|récession|gdp|emploi|chômage|dette/i.test(t),
  Crypto: (t) => /bitcoin|btc|ethereum|eth|crypto|blockchain|altcoin/i.test(t),
};

export default function NewsScreen({ route }) {
  const insets = useSafeAreaInsets();

  const marketKey = route?.params?.marketKey || "DEFAULT";
  const [tab, setTab] = useState("Tout");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const combined = [];

      for (const src of NEWS_SOURCES) {
        try {
          if (src.type === "rss") {
            const xml = await fetchRss(src.url);
            const rssItems = parseRss(xml).slice(0, 25);

            for (const it of rssItems) {
              const senti = analyzeNewsSentiment(it.title, it.description);
              combined.push({
                id: `${src.id}:${it.link}`,
                sourceId: src.id,
                sourceName: src.name,
                title: it.title,
                link: it.link,
                timeAgo: timeAgo(it.pubDate),
                sentiment: senti,
              });
            }
          }

          if (src.type === "x_search") {
            const q = src.queriesByMarket?.[marketKey] || src.queriesByMarket?.DEFAULT;
            const url = `https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query`;
            combined.push({
              id: `${src.id}:${url}`,
              sourceId: src.id,
              sourceName: src.name,
              title: `Tendance marché sur X : ${q}`,
              link: url,
              timeAgo: "",
              sentiment: { label: "neutre", score: 0, emoji: "" },
            });
          }
        } catch {}
      }

      const seen = new Set();
      const deduped = [];
      for (const it of combined) {
        if (!it.link || seen.has(it.link)) continue;
        seen.add(it.link);
        deduped.push(it);
      }

      const mixed = shuffle(deduped).slice(0, 120);

      if (!cancelled) {
        setItems(mixed);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [marketKey]);

  const filtered = useMemo(() => {
    const fn = TAB_FILTERS[tab] || TAB_FILTERS.Tout;
    const out = items.filter((it) => fn(it.title));
    if (tab !== "Tout" && out.length === 0) return items;
    return out;
  }, [items, tab]);

  const openLink = async (url) => {
    try {
      await Linking.openURL(url);
    } catch {}
  };

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {Object.keys(TAB_FILTERS).map((k) => {
          const active = k === tab;
          return (
            <TouchableOpacity
              key={k}
              onPress={() => setTab(k)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{k}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <Text style={styles.loading}>Chargement…</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          ListFooterComponent={<MiniDisclaimer />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Aucune actu disponible.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const c = sourceColor(item.sourceId);
            const s = item.sentiment || { label: "neutre", emoji: "" };
            const sentiColor =
              s.label === "positif" ? "#22c55e" : s.label === "négatif" ? "#fb7185" : "#94a3b8";
            const badge =
              s.label === "positif" ? "🔥 Positif" : s.label === "négatif" ? "⚠️ Négatif" : "Neutre";

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.86}
                onPress={() => openLink(item.link)}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.sourcePill, { borderColor: c }]}>
                    <Text style={[styles.sourceText, { color: c }]} numberOfLines={1}>
                      {item.sourceName}
                    </Text>
                  </View>

                  <View style={[styles.sentPill, { borderColor: sentiColor }]}>
                    <Text style={[styles.sentText, { color: sentiColor }]}>{badge}</Text>
                  </View>

                  {!!item.timeAgo && <Text style={styles.timeAgo}>{item.timeAgo}</Text>}
                </View>

                <Text style={styles.title} numberOfLines={3}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617", padding: 12 },

  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  tab: {
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#020617",
  },
  tabActive: { borderColor: "#22c55e", backgroundColor: "#22c55e22" },
  tabText: { color: "#9ca3af", fontWeight: "800", fontSize: 12 },
  tabTextActive: { color: "#bbf7d0" },

  loading: { color: "#94a3b8", fontWeight: "700" },

  card: {
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sourcePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    maxWidth: 140,
  },
  sourceText: { fontSize: 11, fontWeight: "900" },

  sentPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sentText: { fontSize: 11, fontWeight: "900" },

  timeAgo: { color: "#94a3b8", fontSize: 11, fontWeight: "700", marginLeft: "auto" },

  title: { color: "#f9fafb", fontSize: 13.5, fontWeight: "900", lineHeight: 18 },

  emptyBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#0b1220",
  },
  emptyText: { color: "#9ca3af", fontWeight: "800" },
});
