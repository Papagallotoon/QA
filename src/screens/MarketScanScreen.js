// src/screens/MarketScanScreen.js
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchDailyCandles } from "../api/marketData";
import { analyzeCandles } from "../analysis/engine";

import { SBF120 } from "../data/sbf120";
import { CAC40 } from "../data/cac40";
import { EURONEXT } from "../data/euronext";
import { NASDAQ } from "../data/nasdaq";
import { DOWJONES } from "../data/dowjones";
import { NIKKEI } from "../data/nikkei";
import { FTSE100 } from "../data/ftse100";

import HoloBotCard from "../components/HoloBotCard";
import NewsRotator from "../components/NewsRotator";
import MiniDisclaimer from "../components/MiniDisclaimer";

function currencySymbolForTicker(ticker) {
  if (!ticker) return "";
  const t = ticker.toUpperCase();
  if (t.endsWith(".L")) return "£";
  if (t.endsWith(".T")) return "¥";
  if (t.endsWith(".PA") || t.endsWith(".AS") || t.endsWith(".BR")) return "€";
  return "$";
}

function formatCompact(n) {
  if (n == null || Number.isNaN(n)) return "-";
  try {
    return new Intl.NumberFormat("fr-FR", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return n.toFixed(2);
  }
}

const ALL_UNIVERSES = [
  ...CAC40,
  ...SBF120,
  ...FTSE100,
  ...EURONEXT,
  ...NASDAQ,
  ...DOWJONES,
  ...NIKKEI,
];

const SYMBOL_META = ALL_UNIVERSES.reduce((acc, item) => {
  acc[item.symbol] = { name: item.name };
  return acc;
}, {});

const MARKETS = {
  CAC40: { key: "CAC40", label: "CAC 40", symbols: CAC40.map((s) => s.symbol) },
  SBF120: { key: "SBF120", label: "SBF 120 (France)", symbols: SBF120.map((s) => s.symbol) },
  FTSE100: { key: "FTSE100", label: "FTSE 100 (UK)", symbols: FTSE100.map((s) => s.symbol) },
  EURONEXT: { key: "EURONEXT", label: "Euronext Paris", symbols: EURONEXT.map((s) => s.symbol) },
  NASDAQ: { key: "NASDAQ", label: "Nasdaq (US)", symbols: NASDAQ.map((s) => s.symbol) },
  DOWJONES: { key: "DOWJONES", label: "Dow Jones (US)", symbols: DOWJONES.map((s) => s.symbol) },
  NIKKEI: { key: "NIKKEI", label: "Nikkei (JP)", symbols: NIKKEI.map((s) => s.symbol) },
};

const INDEX_TICKERS = [
  { key: "SBF120", label: "SBF 120", symbol: "^FCHI" },
  { key: "CAC40", label: "CAC 40", symbol: "^FCHI" },
  { key: "EURONEXT", label: "Euronext 100", symbol: "^N100" },
  { key: "NASDAQ", label: "Nasdaq 100", symbol: "^NDX" },
  { key: "DOWJONES", label: "Dow Jones", symbol: "^DJI" },
  { key: "NIKKEI", label: "Nikkei 225", symbol: "^N225" },
  { key: "FTSE100", label: "FTSE 100", symbol: "^FTSE" },
];

function biasColor(bias) {
  if (bias === "haussier") return "#22c55e";
  if (bias === "baissier") return "#fb7185";
  return "#facc15";
}
function directionEmoji(bias) {
  if (bias === "haussier") return "UP 📈";
  if (bias === "baissier") return "DOWN 📉";
  return "NEUTRE ⚖️";
}
function sentimentEmoji(score) {
  if (score >= 80) return "🔥";
  if (score <= 20) return "❄️";
  return "";
}

export default function MarketScanScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [selectedMarketKey, setSelectedMarketKey] = useState("SBF120");
  const [allAssets, setAllAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [indicesCollapsed, setIndicesCollapsed] = useState(false);

  const goToSearchTab = () => {
    const parent = navigation?.getParent?.();
    if (parent?.navigate) {
      parent.navigate("Recherche");
      return;
    }
    navigation.navigate("Search");
  };

  const currentMarket = MARKETS[selectedMarketKey];

  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1500, useNativeDriver: false }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, [floatAnim]);

  // ----- Indices -----
  const [indexData, setIndexData] = useState({});
  const [indexLoading, setIndexLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadIndices() {
      setIndexLoading(true);
      const result = {};
      for (const idx of INDEX_TICKERS) {
        try {
          const candles = await fetchDailyCandles(idx.symbol);
          if (!candles || candles.length < 2) continue;
          const last = candles[candles.length - 1].close;
          const prev = candles[candles.length - 2].close;
          const changePct = ((last - prev) / prev) * 100;
          result[idx.key] = { value: last, changePct };
        } catch {}
      }
      if (!cancelled) {
        setIndexData(result);
        setIndexLoading(false);
      }
    }
    loadIndices();
    return () => (cancelled = true);
  }, []);

  // ----- Scan valeurs -----
  useEffect(() => {
    let cancelled = false;

    async function runScan() {
      if (!currentMarket) return;

      setLoading(true);
      setError("");
      setAllAssets([]);
      setProgress({ done: 0, total: currentMarket.symbols.length });

      const tmp = [];
      let lastError = null;

      for (let i = 0; i < currentMarket.symbols.length; i++) {
        const symbol = currentMarket.symbols[i];
        if (cancelled) break;

        try {
          const candles = await fetchDailyCandles(symbol);
          if (!candles || candles.length < 20) {
            // skip
          } else {
            const analysis = analyzeCandles(candles);
            const indicators = analysis?.indicators || {};
            const lastPrice =
              indicators.lastPrice ?? candles[candles.length - 1]?.close ?? null;

            if (lastPrice != null) {
              const score = analysis?.botScore ?? analysis?.score ?? 50;
              const bias = analysis?.bias ?? "neutre";
              const rsi = indicators.rsi ?? null;

              tmp.push({
                ticker: symbol,
                name: SYMBOL_META[symbol]?.name || null,
                price: lastPrice,
                score,
                bias,
                rsi,
              });
            }
          }
        } catch (e) {
          lastError = e;
        } finally {
          if (!cancelled) {
            setProgress((p) => ({ ...p, done: Math.min(p.done + 1, p.total) }));
          }
        }
      }

      if (!cancelled) {
        if (!tmp.length && lastError) {
          setError(
            lastError.message ||
              `Impossible de récupérer les données pour ${currentMarket.label}.`
          );
        }
        setAllAssets(tmp);
        setLoading(false);
      }
    }

    runScan();
    return () => (cancelled = true);
  }, [selectedMarketKey]);

  // ----- Top 8 (4 haussiers + 4 baissiers) -----
  const rankedAssets = useMemo(() => {
    if (!allAssets.length) return [];

    const MAX_TOTAL = 8;
    const HALF = 4;

    const longs = allAssets
      .filter((a) => a.bias === "haussier")
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const shorts = allAssets
      .filter((a) => a.bias === "baissier")
      .sort((a, b) => (a.score || 0) - (b.score || 0));

    const topLongs = longs.slice(0, HALF);
    const topShorts = shorts.slice(0, HALF);

    let combined = [...topLongs, ...topShorts];

    if (combined.length < MAX_TOTAL) {
      const need = MAX_TOTAL - combined.length;
      const remaining = allAssets
        .filter((a) => !combined.some((c) => c.ticker === a.ticker))
        .sort((a, b) => (b.score || 0) - (a.score || 0));
      combined = combined.concat(remaining.slice(0, need));
    }

    return combined.slice(0, MAX_TOTAL);
  }, [allAssets]);

  const filteredAssets = useMemo(() => {
    if (!search.trim()) return rankedAssets;
    const q = search.toLowerCase();
    return rankedAssets.filter(
      (a) =>
        a.ticker.toLowerCase().includes(q) ||
        (a.name && a.name.toLowerCase().includes(q))
    );
  }, [rankedAssets, search]);

  const renderCard = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.cardOuter, { shadowColor: biasColor(item.bias) }]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("TickerDetail", {
            symbol: item.ticker,
            name: item.name,
            lastPrice: item.price,
            score: item.score,
            bias: item.bias,
            rsi: item.rsi,
          })
        }
      >
        <View
          style={[
            styles.cardInner,
            item.bias === "haussier"
              ? { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "#22c55e" }
              : item.bias === "baissier"
              ? { backgroundColor: "rgba(251,113,133,0.15)", borderColor: "#fb7185" }
              : { backgroundColor: "rgba(250,204,21,0.12)", borderColor: "#facc15" },
          ]}
        >
          <Text style={styles.ticker} numberOfLines={1}>
            {item.ticker}
          </Text>

          {!!item.name && (
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
          )}

          <Text style={[styles.biasTag, { color: biasColor(item.bias) }]} numberOfLines={1}>
            {directionEmoji(item.bias)} {sentimentEmoji(item.score)}
          </Text>

          <View style={styles.rowBottom}>
            <Text style={styles.score} numberOfLines={1}>
              Score {item.score ?? "-"}
            </Text>

            <Text style={styles.price} numberOfLines={1}>
              {item.price != null ? formatCompact(item.price) : "-"}{" "}
              {currencySymbolForTicker(item.ticker)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = (
    <View style={styles.header}>
      <View style={styles.headerTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Scanner {currentMarket.label} 🔎</Text>
          <Text style={styles.subtitle}>
            Holo scanne toutes les valeurs de {currentMarket.label} et classe les meilleurs scores.
          </Text>
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={goToSearchTab} activeOpacity={0.85}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Indices */}
      <View style={styles.indexBlock}>
        <View style={styles.indexHeaderRow}>
          <TouchableOpacity
            style={styles.indexHeaderLeft}
            activeOpacity={0.8}
            onPress={() => setIndicesCollapsed((v) => !v)}
          >
            <Text style={styles.indexTitle}>📊 Indices globaux</Text>
            <Text style={styles.indexChevron}>{indicesCollapsed ? "▸" : "▾"}</Text>
          </TouchableOpacity>
          <View style={styles.indexHeaderRight}>
            {indexLoading && <Text style={styles.indexLoading}>Maj…</Text>}
          </View>
        </View>

        {!indicesCollapsed && (
          <View style={styles.indexGrid}>
            {INDEX_TICKERS.map((idx) => {
              const snap = indexData[idx.key];
              const valueText =
                snap?.value != null ? formatCompact(snap.value) : indexLoading ? "…" : "-";

              const pctRaw = snap?.changePct != null ? snap.changePct : null;
              const pctText =
                pctRaw != null
                  ? `${pctRaw > 0 ? "+" : ""}${pctRaw.toFixed(2)}%`
                  : indexLoading
                  ? "…"
                  : "-";

              const pctStyle =
                pctRaw > 0 ? styles.indexUp : pctRaw < 0 ? styles.indexDown : styles.indexFlat;

              return (
                <View key={idx.key} style={styles.indexItem}>
                  <Text style={styles.indexName} numberOfLines={1}>
                    {idx.label}
                  </Text>
                  <Text style={styles.indexValue} numberOfLines={1}>
                    {valueText}
                  </Text>
                  <Text style={[styles.indexPct, pctStyle]} numberOfLines={1}>
                    {pctText}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Tabs marchés */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.marketTabs}>
        {Object.values(MARKETS).map((mkt) => {
          const isActive = mkt.key === selectedMarketKey;
          return (
            <TouchableOpacity
              key={mkt.key}
              style={[styles.marketChip, isActive && styles.marketChipActive]}
              onPress={() => setSelectedMarketKey(mkt.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.marketChipText, isActive && styles.marketChipTextActive]}>
                {mkt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filtre */}
      <View style={styles.searchWrapper}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Filtrer une valeur…`}
          placeholderTextColor="#64748b"
          style={styles.searchInput}
        />
      </View>

      {/* Progress */}
      <View style={styles.progressBlock}>
        <Text style={styles.progressText}>
          {loading
            ? `Analyse ${progress.done}/${progress.total} valeurs…`
            : `Résultats : ${filteredAssets.length} valeur(s) affichée(s)`}
        </Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );

  const ListFooter = (
    <View style={{ paddingTop: 8, paddingBottom: 10 }}>
      <HoloBotCard floatAnim={floatAnim} marketLabel={currentMarket.label} />
      <NewsRotator />
      <MiniDisclaimer />
    </View>
  );

  return (
    <FlatList
      style={styles.root}
      data={filteredAssets}
      keyExtractor={(it) => it.ticker}
      renderItem={renderCard}
      numColumns={2}
      columnWrapperStyle={styles.columnWrap}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617", paddingHorizontal: 12, paddingTop: 8 },

  header: { marginBottom: 10 },
  headerTopRow: { flexDirection: "row", alignItems: "flex-start" },
  title: { color: "#f9fafb", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: "#9ca3af", fontSize: 12, lineHeight: 17 },

  searchButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    backgroundColor: "#020617",
  },
  searchButtonText: { fontSize: 18 },

  indexBlock: {
    marginTop: 10,
    marginBottom: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1d283a",
  },
  indexHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  indexHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  indexHeaderRight: { flexDirection: "row", alignItems: "center" },
  indexChevron: { color: "#94a3b8", fontSize: 14, fontWeight: "800" },
  indexTitle: { color: "#f9fafb", fontSize: 13, fontWeight: "600" },
  indexLoading: { color: "#22c55e", fontSize: 11 },

  indexGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  indexItem: {
    width: "48%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  indexName: { color: "#e5e7eb", fontSize: 12, fontWeight: "600", marginBottom: 2 },
  indexValue: { color: "#cbd5e1", fontSize: 11, marginBottom: 2 },
  indexPct: { fontSize: 11, fontWeight: "600" },
  indexUp: { color: "#4ade80" },
  indexDown: { color: "#fb7185" },
  indexFlat: { color: "#e5e7eb" },

  marketTabs: { marginTop: 6 },
  marketChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginRight: 8,
    backgroundColor: "#020617",
  },
  marketChipActive: { backgroundColor: "#22c55e22", borderColor: "#22c55e" },
  marketChipText: { color: "#9ca3af", fontSize: 11 },
  marketChipTextActive: { color: "#bbf7d0", fontWeight: "600" },

  searchWrapper: { marginTop: 10 },
  searchInput: {
    backgroundColor: "#020617",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#e5e7eb",
    fontSize: 13,
  },

  progressBlock: { marginTop: 10, marginBottom: 6, paddingHorizontal: 4 },
  progressText: { color: "#94a3b8", fontSize: 12, fontWeight: "800" },
  error: { color: "#fb7185", fontSize: 12, marginTop: 6 },

  // ✅ 2 colonnes
  columnWrap: { justifyContent: "space-between" },

  cardOuter: {
    width: "48%",
    marginBottom: 10,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  cardInner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    backgroundColor: "#0b1220",
  },
  ticker: { color: "#f9fafb", fontSize: 12.5, fontWeight: "900" },
  name: { color: "#9ca3af", marginTop: 6, fontSize: 11.5, fontWeight: "700" },
  biasTag: { marginTop: 6, fontSize: 10.5, fontWeight: "900" },

  rowBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, gap: 8 },
  score: { color: "#cbd5e1", fontSize: 11, fontWeight: "900" },
  price: { color: "#e5e7eb", fontSize: 11.5, fontWeight: "900", maxWidth: 110 },
});