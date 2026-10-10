// src/components/HoloTickerBot.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
} from "react-native";

import {
  DEFAULT_STOP_LOSS_PCT,
  DEFAULT_TAKE_PROFIT_PCT,
  computeLevels,
} from "../config/risk";

function formatMoney(v) {
  if (v == null || isNaN(v)) return "-";
  return v.toFixed(2).replace(".", ",") + " €";
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOT_SIZE = 84;
const INITIAL_X = SCREEN_WIDTH - (BOT_SIZE + 16); // position de départ (droite)
const INITIAL_Y = 120; // sous le header (tabs + safe area)

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export default function HoloTickerBot({
  ticker,
  bias,
  score,
  rsi,
  sma20,
  sma50,
  alertsCount,
  lastPrice,
}) {
  const [open, setOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  // --- micro-animations (scan + pulse) ---
  const scanY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const scan = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        }),
        Animated.timing(scanY, {
          toValue: 0,
          duration: 1700,
          useNativeDriver: true,
        }),
      ])
    );
    const pulser = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );
    scan.start();
    pulser.start();
    return () => {
      scan.stop();
      pulser.stop();
    };
  }, [scanY, pulse]);

  // --- Position draggable ---
  const pan = useRef(
    new Animated.ValueXY({ x: INITIAL_X, y: INITIAL_Y })
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x.__getValue(),
          y: pan.y.__getValue(),
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();

        // Clamp to screen so the bot never gets "lost" off-screen
        const x = pan.x.__getValue();
        const y = pan.y.__getValue();
        // Laisse le bot être déplacé vraiment partout sur la page (marges minimes)
        const clampedX = clamp(x, 4, SCREEN_WIDTH - BOT_SIZE - 4);
        const clampedY = clamp(y, 4, SCREEN_HEIGHT - BOT_SIZE - 4);

        if (clampedX !== x || clampedY !== y) {
          Animated.spring(pan, {
            toValue: { x: clampedX, y: clampedY },
            useNativeDriver: false,
            friction: 7,
            tension: 50,
          }).start();
        }
      },
    })
  ).current;

  // --- Analyse / Signal (BUY / WAIT / SELL) + Pourquoi ---
  const analysis = useMemo(() => {
    const scoreClamp = Math.max(0, Math.min(100, Number(score ?? 0)));

    // signal principal
    let signal = "WAIT";
    if (!bias || bias === "neutre") {
      signal = "WAIT";
    } else if (bias === "haussier") {
      signal = scoreClamp >= 60 ? "BUY" : scoreClamp >= 45 ? "WAIT" : "SELL";
    } else if (bias === "baissier") {
      signal = scoreClamp >= 60 ? "SELL" : scoreClamp >= 45 ? "WAIT" : "BUY";
    }

    const confidence = scoreClamp; // % (0–100)
    const direction = signal === "SELL" ? "short" : "long";
    const levels = computeLevels({
      entryPrice: lastPrice,
      direction,
      slPct: DEFAULT_STOP_LOSS_PCT,
      tpPct: DEFAULT_TAKE_PROFIT_PCT,
    });

    // mini explications (courtes et actionnables)
    const why = [];
    if (rsi != null) {
      if (rsi >= 70) why.push(`RSI ${rsi.toFixed(1)} : zone de surachat (risque de pullback).`);
      else if (rsi <= 30) why.push(`RSI ${rsi.toFixed(1)} : zone de survente (rebond possible).`);
      else why.push(`RSI ${rsi.toFixed(1)} : neutre.`);
    }
    if (sma20 != null && sma50 != null) {
      if (sma20 > sma50) why.push("SMA20 > SMA50 : momentum court terme positif.");
      else if (sma20 < sma50) why.push("SMA20 < SMA50 : momentum court terme négatif.");
      else why.push("SMA20 ≈ SMA50 : tendance peu marquée.");
    }
    if (alertsCount) why.push(`${alertsCount} alerte(s) technique(s) détectée(s).`);

    const biasLabel =
      bias === "haussier" ? "Biais : haussier" : bias === "baissier" ? "Biais : baissier" : "Biais : neutre";

    const theme =
      signal === "BUY"
        ? { accent: "#22c55e", glow: "rgba(34,197,94,0.22)" }
        : signal === "SELL"
        ? { accent: "#ef4444", glow: "rgba(239,68,68,0.18)" }
        : { accent: "#38bdf8", glow: "rgba(56,189,248,0.18)" };

    return {
      signal,
      confidence,
      biasLabel,
      stopLossPct: DEFAULT_STOP_LOSS_PCT,
      takeProfitPct: DEFAULT_TAKE_PROFIT_PCT,
      stopLoss: levels.stopLoss,
      takeProfit: levels.takeProfit,
      why,
      theme,
      rr: `1:${Math.round(DEFAULT_TAKE_PROFIT_PCT / DEFAULT_STOP_LOSS_PCT)}`,
      directionLabel: signal === "SELL" ? "Short" : "Long",
    };
  }, [bias, score, lastPrice, rsi, sma20, sma50, alertsCount]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          left: pan.x,
          top: pan.y,
        },
      ]}
      pointerEvents="box-none"
      {...panResponder.panHandlers}
    >
      {/* Robot futuriste (tap = ouvrir, long press = reset position) */}
      <Pressable
        style={styles.botButton}
        onPress={() => {
          setOpen((o) => {
            const next = !o;
            if (!next) setShowWhy(false);
            return next;
          });
        }}
        onLongPress={() => {
          Animated.spring(pan, {
            toValue: { x: INITIAL_X, y: INITIAL_Y },
            useNativeDriver: false,
            friction: 7,
            tension: 50,
          }).start();
        }}
      >
        {/* halo externe animé */}
        <Animated.View
          style={[
            styles.botGlow,
            {
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08],
                  }),
                },
              ],
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }),
              backgroundColor: analysis.theme.glow,
              shadowColor: analysis.theme.accent,
            },
          ]}
        />

        {/* Socle + "tête" robot */}
        <View style={[styles.botOuterRing, { borderColor: analysis.theme.accent }]}
        >
          <View style={[styles.botInnerRing, { borderColor: analysis.theme.accent, borderTopColor: "#a5f3fc" }]}>
            <View
              style={[
                styles.robotHead,
                { borderColor: analysis.theme.accent, shadowColor: analysis.theme.accent },
              ]}
            >
              {/* Antenne */}
              <View style={styles.antenna}>
                <View style={styles.antennaStem} />
                <View style={styles.antennaDot} />
              </View>

              {/* Visor (yeux) */}
              <View style={styles.visor}>
                <View style={styles.eye} />
                <View style={styles.eye} />

                {/* scan line */}
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [
                        {
                          translateY: scanY.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-10, 10],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>

              {/* bouche */}
              <View style={styles.mouth}>
                <View style={styles.mouthBar} />
                <View style={styles.mouthBarShort} />
              </View>
            </View>
          </View>
        </View>
      </Pressable>

      {/* Badge signal toujours visible */}
      <View
        style={[
          styles.signalPill,
          { borderColor: analysis.theme.accent, backgroundColor: "rgba(2,6,23,0.92)" },
        ]}
      >
        <View style={[styles.signalDot, { backgroundColor: analysis.theme.accent }]} />
        <Text style={[styles.signalText, { color: analysis.theme.accent }]}
        >
          {analysis.signal} • {Math.round(analysis.confidence)}%
        </Text>
      </View>

      {/* Bulle à côté */}
      {open && (
        <View style={styles.bubble}>
          <Text style={styles.bubbleTitle}>Signal • {ticker}</Text>

          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Décision</Text>
            <Text style={styles.kvValue}>
              {analysis.signal} ({Math.round(analysis.confidence)}%)
            </Text>
          </View>

          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Mode</Text>
            <Text style={styles.kvValue}>{analysis.directionLabel} • R/R {analysis.rr}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>{analysis.biasLabel}</Text>
            <Text style={styles.kvValue}>Score : {Math.round(analysis.confidence)}/100</Text>
          </View>

          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Stop loss</Text>
            <Text style={styles.kvValue}>
              -{analysis.stopLossPct}% {analysis.stopLoss != null ? `→ ${formatMoney(analysis.stopLoss)}` : ""}
            </Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Take profit</Text>
            <Text style={styles.kvValue}>
              +{analysis.takeProfitPct}% {analysis.takeProfit != null ? `→ ${formatMoney(analysis.takeProfit)}` : ""}
            </Text>
          </View>

          <Pressable
            style={styles.whyBtn}
            onPress={() => setShowWhy((s) => !s)}
          >
            <Text style={styles.whyBtnText}>{showWhy ? "Masquer" : "Pourquoi ?"}</Text>
          </Pressable>

          {showWhy && (
            <View style={styles.whyBox}>
              {analysis.why.length ? (
                analysis.why.slice(0, 4).map((line, idx) => (
                  <Text key={idx} style={styles.bubbleText}>
                    • {line}
                  </Text>
                ))
              ) : (
                <Text style={styles.bubbleText}>
                  • Pas assez de données (RSI/SMA) pour détailler.
                </Text>
              )}
              <Text style={styles.disclaimer}>
                ⚠️ Indications techniques (pas un conseil financier).
              </Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    zIndex: 999,
    alignItems: "flex-end",
  },
  botButton: {
    width: BOT_SIZE,
    height: BOT_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  botGlow: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(56,189,248,0.18)",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  botOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: "#38bdf8",
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
  },
  botInnerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "#0ea5e9",
    backgroundColor: "#020617",
    // effet léger de lumière venant du haut
    borderTopColor: "#a5f3fc",
    justifyContent: "center",
    alignItems: "center",
  },
  robotHead: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#030b1c",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.85)",
    shadowColor: "#22c55e",
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  antenna: {
    position: "absolute",
    top: -10,
    alignItems: "center",
  },
  antennaStem: {
    width: 2,
    height: 10,
    backgroundColor: "rgba(56,189,248,0.75)",
    borderRadius: 2,
  },
  antennaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(56,189,248,0.95)",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    marginTop: -2,
  },
  visor: {
    width: 44,
    height: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.7)",
    backgroundColor: "rgba(2,6,23,0.9)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginTop: 6,
    overflow: "hidden",
  },
  eye: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(56,189,248,0.95)",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  scanLine: {
    position: "absolute",
    left: -10,
    right: -10,
    height: 3,
    backgroundColor: "rgba(34,197,94,0.45)",
    shadowColor: "#22c55e",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  mouth: {
    width: 44,
    height: 14,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mouthBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(148,163,184,0.7)",
    marginBottom: 3,
  },
  mouthBarShort: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(148,163,184,0.5)",
  },

  // --- Signal always visible ---
  signalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(2,6,23,0.92)",
  },
  signalDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  signalText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  // --- Bubble UI ---
  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.10)",
  },
  kvLabel: {
    color: "rgba(203,213,225,0.75)",
    fontSize: 11,
    fontWeight: "600",
  },
  kvValue: {
    color: "#e5e7eb",
    fontSize: 11,
    fontWeight: "800",
  },
  whyBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.35)",
    backgroundColor: "rgba(2,6,23,0.7)",
  },
  whyBtnText: {
    color: "#e5e7eb",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  whyBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.18)",
    backgroundColor: "rgba(2,6,23,0.55)",
  },
  disclaimer: {
    marginTop: 8,
    color: "rgba(148,163,184,0.85)",
    fontSize: 10,
    lineHeight: 14,
  },
  bubble: {
    maxWidth: 290,
    backgroundColor: "rgba(15,23,42,0.96)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 10,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  bubbleTitle: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  bubbleText: {
    color: "#cbd5e1",
    fontSize: 11,
    lineHeight: 16,
  },
});
