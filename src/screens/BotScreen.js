// src/screens/BotScreen.js
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { fetchDailyCandles } from "../api/marketData";
import { analyzeCandles } from "../analysis/engine";
import { MARKET_LIST } from "../config/markets";
import MiniDisclaimer from "../components/MiniDisclaimer";

function biasColor(bias) {
  if (bias === "haussier") return "#22c55e";
  if (bias === "baissier") return "#fb7185";
  return "#facc15";
}

export default function BotScreen() {
  const [selectedMarketKey, setSelectedMarketKey] = useState(
    MARKET_LIST[0]?.key || "CUSTOM_WATCHLIST"
  );
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");

  const selectedMarket = useMemo(
    () => MARKET_LIST.find((m) => m.key === selectedMarketKey) || MARKET_LIST[0],
    [selectedMarketKey]
  );

  async function runScan() {
    if (!selectedMarket || !selectedMarket.symbols.length) return;

    setLoading(true);
    setError("");
    setResults([]);
    setProgress({ done: 0, total: selectedMarket.symbols.length });

    const out = [];

    try {
      let idx = 0;
      for (const symbol of selectedMarket.symbols) {
        idx += 1;
        setProgress({ done: idx, total: selectedMarket.symbols.length });

        try {
          const candles = await fetchDailyCandles(symbol);
          const analysis = analyzeCandles(candles);
          const indicators = analysis?.indicators || {};
          const lastPrice = indicators.lastPrice;

          if (!lastPrice) continue;

          out.push({
            symbol,
            bias: analysis.bias,
            score: analysis.score,
            botScore: analysis.botScore ?? analysis.score ?? 50,
            rsi: indicators.rsi,
            lastPrice,
          });
        } catch (e) {
          // on skip le symbole en erreur
        }
      }

      // Tri du meilleur au moins bon
      out.sort((a, b) => (b.botScore || 0) - (a.botScore || 0));
      setResults(out);
    } catch (e) {
      setError(e.message || "Erreur lors du scan du marché.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarketKey]);

  const hotLongs = useMemo(() => {
    if (!results.length) return [];
    const hot = results.filter(
      (r) =>
        (r.botScore || 0) >= 75 &&
        r.bias === "haussier" &&
        r.rsi != null &&
        r.rsi > 35 &&
        r.rsi < 70
    );
    return hot.length ? hot.slice(0, 20) : results.slice(0, 10);
  }, [results]);

  const hotShorts = useMemo(() => {
    if (!results.length) return [];
    const sorted = [...results].sort(
      (a, b) => (a.botScore || 0) - (b.botScore || 0)
    );
    const hot = sorted.filter(
      (r) =>
        (r.botScore || 0) <= 35 &&
        r.bias === "baissier" &&
        r.rsi != null &&
        r.rsi > 40 // rebond déjà fait / encore de la place à la baisse
    );
    return hot.length ? hot.slice(0, 20) : sorted.slice(0, 10);
  }, [results]);

  const globalSentiment = useMemo(() => {
    if (!results.length) return null;
    const avg =
      results.reduce((sum, r) => sum + (r.botScore || 50), 0) /
      results.length;
    const rounded = Math.round(avg);
    let label = "Neutre";
    if (rounded >= 70) label = "Haussier";
    else if (rounded <= 40) label = "Baissier";
    return { score: rounded, label };
  }, [results]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Bot Scanner Marchés</Text>
        <Text style={styles.subtitle}>
          Choisis un marché (CAC 40, Euronext, Nasdaq, etc.). Le bot scanne
          chaque action, calcule un score d’opportunité et te donne les valeurs
          "en feu" en long et en short.
        </Text>
      </View>

      {/* Sélecteur de marché */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.marketTabs}
      >
        {MARKET_LIST.map((m) => {
          const active = m.key === selectedMarketKey;
          return (
            <TouchableOpacity
              key={m.key}
              style={[
                styles.marketTab,
                active && styles.marketTabActive,
              ]}
              onPress={() => setSelectedMarketKey(m.key)}
              disabled={loading}
            >
              <Text
                style={[
                  styles.marketTabText,
                  active && styles.marketTabTextActive,
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Info scan */}
      <View style={styles.block}>
        <View style={styles.blockHeaderRow}>
          <Text style={styles.blockTitle}>Scan en cours</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={runScan}
            disabled={loading}
          >
            <Text style={styles.refreshText}>
              {loading ? "Scan..." : "Relancer"}
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.rowCenter}>
            <ActivityIndicator color="#22c55e" />
            <Text style={styles.loadingText}>
              {progress.total
                ? `Analyse ${progress.done}/${progress.total} valeurs…`
                : "Initialisation du scan…"}
            </Text>
          </View>
        )}

        {!loading && !error && (
          <>
            <Text style={styles.infoLine}>
              Valeurs analysées :{" "}
              <Text style={styles.value}>
                {results.length}/{selectedMarket.symbols.length}
              </Text>
            </Text>
            {globalSentiment && (
              <Text style={styles.infoLine}>
                Sentiment global :{" "}
                <Text style={styles.value}>
                  {globalSentiment.label} ({globalSentiment.score}/100)
                </Text>
              </Text>
            )}
          </>
        )}

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
      </View>

      {/* Top Long */}
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Top Long (valeurs "en feu")</Text>
        {!hotLongs.length && !loading ? (
          <Text style={styles.infoLine}>
            Aucune valeur long très forte détectée pour ce marché (avec les
            critères actuels).
          </Text>
        ) : null}

        {hotLongs.map((r) => (
          <View key={r.symbol} style={styles.row}>
            <View>
              <Text style={styles.symbol}>{r.symbol}</Text>
              <Text style={styles.sub}>
                BotScore : {r.botScore}/100 — {r.bias}
              </Text>
              <Text style={styles.sub}>
                Prix : {r.lastPrice?.toFixed(2)} $ • RSI :{" "}
                {r.rsi != null ? r.rsi.toFixed(1) : "-"}
              </Text>
            </View>
            <View
              style={[
                styles.biasBadge,
                { backgroundColor: biasColor(r.bias) },
              ]}
            >
              <Text style={styles.biasText}>LONG</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Top Short / couverture */}
      <View style={styles.block}>
        <Text style={styles.blockTitle}>
          Top Short / Couverture (valeurs fragiles)
        </Text>
        {!hotShorts.length && !loading ? (
          <Text style={styles.infoLine}>
            Aucune valeur short très marquée détectée pour ce marché (avec les
            critères actuels).
          </Text>
        ) : null}

        {hotShorts.map((r) => (
          <View key={r.symbol} style={styles.row}>
            <View>
              <Text style={styles.symbol}>{r.symbol}</Text>
              <Text style={styles.sub}>
                BotScore : {r.botScore}/100 — {r.bias}
              </Text>
              <Text style={styles.sub}>
                Prix : {r.lastPrice?.toFixed(2)} $ • RSI :{" "}
                {r.rsi != null ? r.rsi.toFixed(1) : "-"}
              </Text>
            </View>
            <View
              style={[
                styles.biasBadge,
                { backgroundColor: biasColor(r.bias) },
              ]}
            >
              <Text style={styles.biasText}>SHORT</Text>
            </View>
          </View>
        ))}
      </View>
	  <MiniDisclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    color: "#f9fafb",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    lineHeight: 18,
  },
  marketTabs: {
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  marketTab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  marketTabActive: {
    borderColor: "#22c55e",
    backgroundColor: "#022c22",
  },
  marketTabText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
  },
  marketTabTextActive: {
    color: "#bbf7d0",
  },
  block: {
    backgroundColor: "#020617",
    borderRadius: 18,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#111827",
  },
  blockHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  blockTitle: {
    color: "#f9fafb",
    fontWeight: "700",
    fontSize: 15,
  },
  refreshBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#22c55e",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  refreshText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "600",
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  loadingText: {
    color: "#9ca3af",
    fontSize: 13,
    marginLeft: 8,
  },
  infoLine: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 4,
  },
  value: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  errorText: {
    color: "#f97373",
    fontSize: 13,
    marginTop: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  symbol: {
    color: "#f9fafb",
    fontSize: 15,
    fontWeight: "700",
  },
  sub: {
    color: "#9ca3af",
    fontSize: 12,
  },
  biasBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  biasText: {
    color: "#020617",
    fontWeight: "700",
    fontSize: 11,
  },
});
