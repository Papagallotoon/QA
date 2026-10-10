// src/screens/TickerDetailScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XMLParser } from "fast-xml-parser";

import { fetchDailyCandles } from "../api/marketData";
import { analyzeCandles } from "../analysis/engine";

import YahooCandleChart from "../components/YahooCandleChart";
import HoloTickerBot from "../components/HoloTickerBot";
import MiniDisclaimer from "../components/MiniDisclaimer";
import FuturisticBackButton from "../components/FuturisticBackButton";

// ✅ NOUVEAUX IMPORTS
import EducationalTooltip from "../components/EducationalTooltip";
import WatchlistButton from "../components/WatchlistButton";
import QuantumLoader from "../components/QuantumLoader";

import {
  DEFAULT_STOP_LOSS_PCT,
  DEFAULT_TAKE_PROFIT_PCT,
  computeLevels,
} from "../config/risk";

/* ========================= NEWS (RSS) ========================= */
const rssParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
});

function normalizeItems(items) {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

function cleanText(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .trim();
}

function extractSourceFromTitle(title) {
  const m = (title || "").match(/\s-\s(.+)$/);
  return m?.[1]?.trim() || null;
}

function enhanceQuery(q) {
  const t = (q || "").toUpperCase();
  if (t.includes(".PA") || t.includes("CAC") || t.includes("SBF")) return `${q} France`;
  if (t.includes(".L") || t.includes("FTSE")) return `${q} UK`;
  if (t.includes("^GSPC") || t.includes("NASDAQ") || t.includes("DOW")) return `${q} US`;
  if (t.includes("^N225") || t.includes("NIKKEI")) return `${q} Japan`;
  return q;
}

async function fetchNewsForTicker({ query, max = 6, lang = "fr", gl = "FR" }) {
  const q = enhanceQuery(query);
  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(q)}` +
    `&hl=${lang}&gl=${gl}&ceid=${gl}:${lang}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Impossible de charger les actualités.");
  const xml = await res.text();

  const json = rssParser.parse(xml);
  const channel = json?.rss?.channel;
  const items = normalizeItems(channel?.item);

  return items
    .map((it) => {
      const title = cleanText(it?.title);
      const link = cleanText(it?.link);
      const pubDate = cleanText(it?.pubDate);
      const source = extractSourceFromTitle(title) || "Actu";
      return { title, link, source, pubDate };
    })
    .filter((x) => x.title && x.link)
    .slice(0, max);
}

/* ========================= HELPERS ========================= */
function biasColor(bias) {
  if (bias === "haussier") return "#22c55e";
  if (bias === "baissier") return "#fb7185";
  return "#facc15";
}

function signalPolarity(text) {
  const t = (text || "").toLowerCase();

  if (
    t.includes("haussier") ||
    t.includes("tendance haussière") ||
    t.includes("momentum haussier") ||
    t.includes("au-dessus") ||
    t.includes("breakout") ||
    t.includes("rebond") ||
    t.includes("bullish") ||
    t.includes("uptrend") ||
    t.includes("support") ||
    t.includes("retournement haussier") ||
    t.includes("favorable") ||
    t.includes("convergent") ||
    t.includes("acheteurs")
  ) {
    return "bull";
  }

  if (
    t.includes("baissier") ||
    t.includes("tendance baissière") ||
    t.includes("momentum baissier") ||
    t.includes("en dessous") ||
    t.includes("en-dessous") ||
    t.includes("rejet") ||
    t.includes("fragile") ||
    t.includes("bearish") ||
    t.includes("downtrend") ||
    t.includes("résistance") ||
    t.includes("pression vendeuse") ||
    t.includes("danger") ||
    t.includes("risque") ||
    t.includes("faible")
  ) {
    return "bear";
  }

  return "neutral";
}

function AlertLine({ text }) {
  const raw = text || "";
  const idx = raw.indexOf(":");

  if (idx === -1) {
    const pol = signalPolarity(raw);
    const st =
      pol === "bull" ? styles.bullText : pol === "bear" ? styles.bearText : styles.neutralText;
    return <Text style={[styles.alertLine, st]}>• {raw}</Text>;
  }

  const left = raw.slice(0, idx + 1);
  const right = raw.slice(idx + 1).trim();

  const pol = signalPolarity(right || raw);
  const valueStyle =
    pol === "bull" ? styles.bullText : pol === "bear" ? styles.bearText : styles.neutralText;

  return (
    <Text style={styles.alertLine}>
      <Text style={styles.alertBullet}>• </Text>
      <Text style={styles.alertLabel}>{left} </Text>
      <Text style={[styles.alertValue, valueStyle]}>{right}</Text>
    </Text>
  );
}

function PatternLine({ label, enabled, direction = "neutral" }) {
  const valueStyle =
    enabled && direction === "bull"
      ? styles.bullText
      : enabled && direction === "bear"
      ? styles.bearText
      : enabled
      ? styles.bullText
      : styles.neutralText;

  return (
    <Text style={styles.line}>
      {label} : <Text style={[styles.value, valueStyle]}>{enabled ? "Oui" : "Non"}</Text>
    </Text>
  );
}

function estimateHorizon(indicators, bias, score) {
  const { rsi, sma20, sma50 } = indicators || {};

  if (!bias || bias === "neutre" || score == null) {
    return {
      label: "Horizon incertain",
      comment:
        "Le bot ne détecte pas encore un signal directionnel assez fort pour estimer une période probable.",
    };
  }

  const strongScore = score >= 80;
  const mediumScore = score >= 60;

  const hasMmTrend =
    sma20 != null && sma50 != null && sma50 !== 0
      ? Math.abs(sma20 - sma50) / Math.abs(sma50)
      : null;

  if (rsi != null && (rsi > 70 || rsi < 30)) {
    return {
      label: "1 à 3 jours",
      comment:
        "Le signal est tendu (RSI extrême) : les mouvements se jouent souvent sur quelques séances.",
    };
  }

  if (strongScore) {
    return {
      label: "3 à 7 jours",
      comment:
        "Plusieurs signaux convergent : scénario plutôt court terme (quelques séances).",
    };
  }

  if (mediumScore || (hasMmTrend != null && hasMmTrend > 0.02)) {
    return {
      label: "7 à 20 jours",
      comment:
        "Tendance présente mais sans excès : mouvement potentiellement plus progressif.",
    };
  }

  return {
    label: "Horizon court / incertain",
    comment: "Signaux modestes ou mixtes : difficile de dégager une période claire.",
  };
}

/* ========================= COMPONENT ========================= */
export default function TickerDetailScreen({ route }) {
  const insets = useSafeAreaInsets();

  const {
    symbol: routeSymbol,
    ticker: routeTicker,
    name: routeName,
    lastPrice: routeLastPrice,
    score: routeScore,
    bias: routeBias,
    rsi: routeRsi,
  } = route?.params || {};

  const symbol = routeSymbol || routeTicker || "";

  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!symbol) {
        setError("Symbole invalide ou manquant.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await fetchDailyCandles(symbol);
        if (!cancelled) setCandles(data || []);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Erreur lors du chargement des données pour ce symbole.");
          setCandles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      if (!symbol) return;

      setNewsLoading(true);
      setNewsError("");

      try {
        const q = routeName ? `${symbol} ${routeName}` : symbol;
        const items = await fetchNewsForTicker({ query: q, max: 6, lang: "fr", gl: "FR" });
        if (!cancelled) setNews(items || []);
      } catch (e) {
        if (!cancelled) {
          setNews([]);
          setNewsError(e?.message || "Erreur actus.");
        }
      } finally {
        if (!cancelled) setNewsLoading(false);
      }
    }

    loadNews();
    return () => {
      cancelled = true;
    };
  }, [symbol, routeName]);

  const analysis = useMemo(() => (candles.length ? analyzeCandles(candles) : null), [candles]);

  const indicators = analysis?.indicators || {};
  const computedScore = analysis?.score ?? analysis?.botScore ?? null;
  const computedBias = analysis?.bias ?? "neutre";

  const alertsRaw = analysis?.alerts || [];
  const alerts = useMemo(() => {
    return (alertsRaw || []).map((a) => {
      if (typeof a === "string") return a;
      if (a?.message && a?.label) return `${a.label} : ${a.message}`;
      if (a?.label) return a.label;
      return String(a);
    });
  }, [alertsRaw]);

  const patterns = analysis?.patterns || {};

  const lastPriceFromData =
    indicators.lastPrice ?? (candles.length ? candles[candles.length - 1].close : null);

  const lastPrice = routeLastPrice ?? lastPriceFromData;
  const score = computedScore ?? routeScore ?? null;
  const bias = routeBias ?? computedBias ?? "neutre";

  const rsi = indicators.rsi ?? routeRsi ?? null;
  const sma20 = indicators.sma20 ?? null;
  const sma50 = indicators.sma50 ?? null;

  const atrPct14 = indicators.atrPct14 ?? indicators.atrPct ?? null;
  const adx14 = indicators.adx14 ?? indicators.adx ?? null;
  const diPlus14 = indicators.diPlus14 ?? indicators.diPlus ?? null;
  const diMinus14 = indicators.diMinus14 ?? indicators.diMinus ?? null;
  const supertrendDir = indicators.supertrendDir ?? indicators.supertrend ?? null;

  const supertrendStyle =
    supertrendDir === "haussier"
      ? styles.bullText
      : supertrendDir === "baissier"
      ? styles.bearText
      : styles.neutralText;

  const longLevels = useMemo(() => {
    if (lastPrice == null) return { stopLoss: null, takeProfit: null };
    try {
      return computeLevels(lastPrice, DEFAULT_STOP_LOSS_PCT, DEFAULT_TAKE_PROFIT_PCT);
    } catch {
      return { stopLoss: null, takeProfit: null };
    }
  }, [lastPrice]);

  const shortLevels = useMemo(() => {
    if (lastPrice == null) return { stopLoss: null, takeProfit: null };
    const entry = lastPrice;
    const stopLoss = entry * (1 + DEFAULT_STOP_LOSS_PCT / 100);
    const takeProfit = entry * (1 - DEFAULT_TAKE_PROFIT_PCT / 100);
    return { stopLoss, takeProfit };
  }, [lastPrice]);

  const horizon = useMemo(() => estimateHorizon(indicators, bias, score), [indicators, bias, score]);

  const rsiExplainStyle =
    rsi != null && rsi > 60
      ? styles.bullText
      : rsi != null && rsi < 40
      ? styles.bearText
      : styles.neutralText;

  const mmExplainStyle =
    sma20 != null && sma50 != null && sma20 > sma50
      ? styles.bullText
      : sma20 != null && sma50 != null && sma20 < sma50
      ? styles.bearText
      : styles.neutralText;

  // ✅ LOADER AMÉLIORÉ
  if (loading) {
    return (
      <View style={styles.center}>
        <QuantumLoader message="Chargement des données..." />
      </View>
    );
  }

  if (!symbol) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Symbole invalide.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FuturisticBackButton />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
      >
        {/* HEADER AVEC WATCHLIST BUTTON */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {symbol} {routeName ? `• ${routeName}` : ""}
          </Text>

          <View style={styles.headerRow}>
            <EducationalTooltip term="bias" inline>
              <Text style={[styles.headerScore, { color: biasColor(bias) }]}>
                Score {score != null ? `${score}/100` : "-"} • {bias}
              </Text>
            </EducationalTooltip>

            <View style={styles.headerPriceCol}>
              <Text style={styles.headerPrice}>
                {lastPrice != null ? lastPrice.toFixed(2) : "-"}
              </Text>
            </View>
          </View>

          {/* BOUTON WATCHLIST */}
          <View style={{ marginTop: 12 }}>
            <WatchlistButton
              ticker={symbol}
              name={routeName}
              price={lastPrice}
              score={score}
              bias={bias}
            />
          </View>

          {!!error && <Text style={styles.errorSmall}>{error}</Text>}
        </View>

        {/* GRAPH */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Graphique prix (Yahoo)</Text>
          <Text style={styles.blockSubtitle}>
            L'évolution des prix aide à visualiser supports/résistances et zones clés.
          </Text>
          <YahooCandleChart candles={candles} />
        </View>

        {/* INDICATEURS TECH AVEC TOOLTIPS */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Indicateurs techniques</Text>

          <Text style={styles.line}>
            Prix : <Text style={[styles.value, styles.neutralText]}>
              {lastPrice != null ? lastPrice.toFixed(2) : "-"}
            </Text>
          </Text>

          <EducationalTooltip term="rsi" inline>
            <Text style={styles.line}>
              RSI : <Text style={[styles.value, rsiExplainStyle]}>
                {rsi != null ? rsi.toFixed(1) : "-"}
              </Text>
            </Text>
          </EducationalTooltip>

          <EducationalTooltip term="sma" inline>
            <Text style={styles.line}>
              SMA20 : <Text style={[styles.value, mmExplainStyle]}>
                {sma20 != null ? sma20.toFixed(2) : "-"}
              </Text>
            </Text>
          </EducationalTooltip>

          <EducationalTooltip term="sma" inline>
            <Text style={styles.line}>
              SMA50 : <Text style={[styles.value, mmExplainStyle]}>
                {sma50 != null ? sma50.toFixed(2) : "-"}
              </Text>
            </Text>
          </EducationalTooltip>
        </View>

        {/* INDICATEURS AVANCÉS AVEC TOOLTIPS */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Indicateurs avancés</Text>

          <EducationalTooltip term="atr" inline>
            <Text style={styles.line}>
              ATR% (14) : <Text style={[styles.value, styles.neutralText]}>
                {atrPct14 != null ? `${atrPct14.toFixed(2)}%` : "-"}
              </Text>
            </Text>
          </EducationalTooltip>

          <EducationalTooltip term="adx" inline>
            <Text style={styles.line}>
              ADX (14) : <Text style={[styles.value, styles.neutralText]}>
                {adx14 != null ? adx14.toFixed(1) : "-"}
              </Text>
            </Text>
          </EducationalTooltip>

          <Text style={styles.line}>
            DI+ / DI− : <Text style={[styles.value, styles.neutralText]}>
              {diPlus14 != null ? diPlus14.toFixed(1) : "-"} / {diMinus14 != null ? diMinus14.toFixed(1) : "-"}
            </Text>
          </Text>

          <EducationalTooltip term="supertrend" inline>
            <Text style={styles.line}>
              Supertrend : <Text style={[styles.value, supertrendStyle]}>
                {supertrendDir || "-"}
              </Text>
            </Text>
          </EducationalTooltip>
        </View>

        {/* SL / TP AVEC TOOLTIPS */}
        <View style={styles.block}>
          <EducationalTooltip term="stopLoss">
            <Text style={styles.blockTitle}>🛡️ Stop Loss & Take Profit</Text>
          </EducationalTooltip>
          
          <Text style={styles.blockSubtitle}>
            Recommandation "standard" : Stop Loss ~{DEFAULT_STOP_LOSS_PCT}% et Take Profit ~{DEFAULT_TAKE_PROFIT_PCT}% (ratio 1:2).
          </Text>

          <Text style={styles.line}>
            Prix de référence : <Text style={[styles.value, styles.neutralText]}>
              {lastPrice != null ? lastPrice.toFixed(2) : "-"}
            </Text>
          </Text>

          <View style={styles.levelsGrid}>
            <View style={styles.levelCard}>
              <Text style={styles.levelTitle}>Scénario Achat (Long)</Text>
              
              <EducationalTooltip term="stopLoss" inline>
                <Text style={styles.levelLine}>
                  Stop Loss ({DEFAULT_STOP_LOSS_PCT}%) : <Text style={[styles.value, styles.bearText]}>
                    {longLevels.stopLoss != null ? longLevels.stopLoss.toFixed(2) : "-"}
                  </Text>
                </Text>
              </EducationalTooltip>
              
              <EducationalTooltip term="takeProfit" inline>
                <Text style={styles.levelLine}>
                  Take Profit ({DEFAULT_TAKE_PROFIT_PCT}%) : <Text style={[styles.value, styles.bullText]}>
                    {longLevels.takeProfit != null ? longLevels.takeProfit.toFixed(2) : "-"}
                  </Text>
                </Text>
              </EducationalTooltip>
            </View>

            <View style={styles.levelCard}>
              <Text style={styles.levelTitle}>Scénario Vente (Short)</Text>
              
              <EducationalTooltip term="stopLoss" inline>
                <Text style={styles.levelLine}>
                  Stop Loss ({DEFAULT_STOP_LOSS_PCT}%) : <Text style={[styles.value, styles.bearText]}>
                    {shortLevels.stopLoss != null ? shortLevels.stopLoss.toFixed(2) : "-"}
                  </Text>
                </Text>
              </EducationalTooltip>
              
              <EducationalTooltip term="takeProfit" inline>
                <Text style={styles.levelLine}>
                  Take Profit ({DEFAULT_TAKE_PROFIT_PCT}%) : <Text style={[styles.value, styles.bullText]}>
                    {shortLevels.takeProfit != null ? shortLevels.takeProfit.toFixed(2) : "-"}
                  </Text>
                </Text>
              </EducationalTooltip>
            </View>
          </View>

          <Text style={[styles.explain, styles.neutralText]}>
            Astuce : limiter le risque à ~1–2% du capital par opération, puis viser un ratio risque/rendement d'au moins 1:2.
          </Text>
        </View>

        {/* HORIZON */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>🎯 Horizon estimé du mouvement</Text>

          <EducationalTooltip term="bias" inline>
            <Text style={styles.line}>
              Biais : <Text style={[
                styles.value,
                bias === "haussier" ? styles.bullText : bias === "baissier" ? styles.bearText : styles.neutralText,
              ]}>
                {bias}
              </Text>
            </Text>
          </EducationalTooltip>

          <Text style={styles.line}>
            Période probable : <Text style={[styles.value, styles.neutralText]}>
              {horizon.label}
            </Text>
          </Text>

          {horizon.comment && (
            <Text style={[styles.explain, styles.neutralText]}>{horizon.comment}</Text>
          )}
        </View>

        {/* CONTEXTE */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Lecture rapide du contexte</Text>

          {rsi != null && (
            <Text style={[styles.explain, rsiExplainStyle]}>
              • RSI à {rsi.toFixed(1)} :{" "}
              {rsi > 70
                ? "zone de surachat, essoufflement possible."
                : rsi < 30
                ? "zone de survente, rebond possible."
                : "zone plutôt neutre, momentum équilibré."}
            </Text>
          )}

          {sma20 != null && sma50 != null && (
            <Text style={[styles.explain, mmExplainStyle]}>
              • Moyennes mobiles : SMA20{" "}
              {sma20 > sma50
                ? "au-dessus"
                : sma20 < sma50
                ? "en dessous"
                : "au niveau"}{" "}
              de SMA50 – biais{" "}
              {sma20 > sma50 ? "plutôt haussier" : sma20 < sma50 ? "plutôt baissier" : "neutre"}.
            </Text>
          )}

          {!alerts.length ? (
            <Text style={[styles.explain, styles.neutralText]}>
              • Aucun signal fort détecté sur cette valeur pour l'instant.
            </Text>
          ) : (
            <Text style={[styles.explain, styles.neutralText]}>
              • Le bot a détecté{" "}
              <Text style={{ fontWeight: "700" }}>{alerts.length} alerte(s)</Text>{" "}
              technique(s). Regarde le graphique pour situer les zones clés.
            </Text>
          )}
        </View>

        {/* SIGNAUX */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Signaux détectés</Text>
          {alerts.length ? (
            alerts.map((a, i) => <AlertLine key={i} text={a} />)
          ) : (
            <Text style={styles.alertLine}>Aucun signal particulier détecté.</Text>
          )}
        </View>

        {/* PATTERNS AVEC TOOLTIP */}
        <View style={styles.block}>
          <EducationalTooltip term="patterns">
            <Text style={styles.blockTitle}>Patterns de chandeliers</Text>
          </EducationalTooltip>

          <PatternLine label="Doji" enabled={!!patterns.doji} direction="neutral" />
          <PatternLine label="Marteau" enabled={!!patterns.hammer} direction="bull" />
          <PatternLine label="Shooting Star" enabled={!!patterns.shootingStar} direction="bear" />
          <PatternLine label="Morning Star" enabled={!!patterns.morningStar} direction="bull" />
          <PatternLine label="Evening Star" enabled={!!patterns.eveningStar} direction="bear" />
          <PatternLine label="Englobante haussière" enabled={!!patterns.bullishEngulfing} direction="bull" />
          <PatternLine label="Englobante baissière" enabled={!!patterns.bearishEngulfing} direction="bear" />
          <PatternLine label="Pin Bar bullish" enabled={!!patterns.pinBarBull} direction="bull" />
          <PatternLine label="Pin Bar bearish" enabled={!!patterns.pinBarBear} direction="bear" />
          <PatternLine label="Harami haussier" enabled={!!patterns.bullishHarami} direction="bull" />
          <PatternLine label="Harami baissier" enabled={!!patterns.bearishHarami} direction="bear" />
          <PatternLine label="Three White Soldiers" enabled={!!patterns.threeWhiteSoldiers} direction="bull" />
          <PatternLine label="Three Black Crows" enabled={!!patterns.threeBlackCrows} direction="bear" />
          <PatternLine label="Tweezer Bottom" enabled={!!patterns.tweezerBottom} direction="bull" />
          <PatternLine label="Tweezer Top" enabled={!!patterns.tweezerTop} direction="bear" />
          <PatternLine label="Dark Cloud Cover" enabled={!!patterns.darkCloudCover} direction="bear" />
        </View>

        {/* ACTUS */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>📰 Actualités liées à {symbol}</Text>

          {newsLoading ? (
            <Text style={[styles.explain, styles.neutralText]}>Chargement des actus…</Text>
          ) : newsError ? (
            <Text style={[styles.explain, styles.bearText]}>{newsError}</Text>
          ) : news.length ? (
            news.map((n, i) => (
              <TouchableOpacity
                key={`${n.link}-${i}`}
                activeOpacity={0.85}
                onPress={() => Linking.openURL(n.link)}
                style={styles.newsItem}
              >
                <Text style={styles.newsTitle} numberOfLines={2}>
                  {n.title}
                </Text>
                <Text style={styles.newsMeta} numberOfLines={1}>
                  {n.source} {n.pubDate ? `• ${n.pubDate}` : ""}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={[styles.explain, styles.neutralText]}>Aucune actu disponible.</Text>
          )}
        </View>

        <MiniDisclaimer />
      </ScrollView>

      <HoloTickerBot
        ticker={symbol}
        bias={bias}
        score={score}
        rsi={rsi}
        sma20={sma20}
        sma50={sma50}
        alertsCount={alerts.length}
        lastPrice={lastPrice}
      />
    </View>
  );
}

/* ========================= STYLES ========================= */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  scroll: { flex: 1 },

  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },

  error: { color: "#f97373", fontSize: 14, paddingHorizontal: 16, textAlign: "center" },
  errorSmall: { color: "#f97373", fontSize: 11, marginTop: 4 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  title: { color: "#f9fafb", fontSize: 20, fontWeight: "800" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, alignItems: "center" },
  headerScore: { fontSize: 14, fontWeight: "700" },
  headerPriceCol: { alignItems: "flex-end" },
  headerPrice: { color: "#e5e7eb", fontSize: 18, fontWeight: "800" },

  block: {
    backgroundColor: "#020617",
    borderRadius: 18,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#111827",
  },
  blockTitle: { color: "#f9fafb", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  blockSubtitle: { color: "#9ca3af", fontSize: 11, marginBottom: 8 },

  line: { color: "#9ca3af", fontSize: 13, marginBottom: 4 },
  value: { color: "#e5e7eb", fontWeight: "700" },

  explain: { fontSize: 12, marginBottom: 4 },
  neutralText: { color: "#94a3b8" },
  bullText: { color: "#22c55e" },
  bearText: { color: "#fb7185" },

  levelsGrid: { flexDirection: "row", gap: 10, marginTop: 10 },
  levelCard: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#0b1220",
    borderWidth: 1,
    borderColor: "#111827",
  },
  levelTitle: { color: "#e5e7eb", fontSize: 12, fontWeight: "800", marginBottom: 6 },
  levelLine: { color: "#9ca3af", fontSize: 12, marginBottom: 4 },

  alertLine: { color: "#cbd5e1", fontSize: 12, marginTop: 6, fontWeight: "600" },
  alertBullet: { color: "#94a3b8" },
  alertLabel: { color: "#cbd5e1", fontWeight: "700" },
  alertValue: { fontWeight: "900" },

  newsItem: {
    marginTop: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#0b1220",
  },
  newsTitle: { color: "#f9fafb", fontSize: 12.5, fontWeight: "800", lineHeight: 17 },
  newsMeta: { color: "#94a3b8", fontSize: 11, marginTop: 6, fontWeight: "700" },
});