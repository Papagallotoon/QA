// src/components/HoloBotCard.js
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
} from "react-native";

// SL/TP “recommandés”
const DEFAULT_SL_PCT = 2;
const DEFAULT_TP_PCT = 4;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function fmtPct(n) {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(0)}%`;
}

function dominantBias(assets) {
  const bull = assets.filter((a) => a.bias === "haussier").length;
  const bear = assets.filter((a) => a.bias === "baissier").length;
  if (bull > bear) return "haussier";
  if (bear > bull) return "baissier";
  return "neutre";
}

function pickTop(assets, bias, n = 2) {
  return assets
    .filter((a) => a.bias === bias)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, n);
}

// ✅ Couleur de la partie APRÈS ":"
function afterColonStyle(bias, styles) {
  if (bias === "haussier") return styles.signalBull;
  if (bias === "baissier") return styles.signalBear;
  return styles.signalNeutral;
}

export default function HoloBotCard({ assets = [], loading = false, marketName = "" }) {
  const [open, setOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  // micro anim holo
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    ).start();
  }, [pulse]);

  const summary = useMemo(() => {
    const safeAssets = Array.isArray(assets) ? assets : [];
    const bias = dominantBias(safeAssets);

    const focus =
      bias === "haussier"
        ? pickTop(safeAssets, "haussier", 4)
        : bias === "baissier"
        ? pickTop(safeAssets, "baissier", 4)
        : safeAssets.slice(0, 4);

    const avgScore =
      focus.length > 0
        ? focus.reduce((s, a) => s + (a.score || 0), 0) / focus.length
        : 50;

    const confidence = clamp(Math.round(avgScore), 0, 100);
    const signal = bias === "haussier" ? "BUY" : bias === "baissier" ? "SELL" : "WAIT";

    // textes courts (tu peux les relier à ton engine si tu veux plus tard)
    const reasons =
      bias === "haussier"
        ? ["Momentum haussier", "Tendance favorable", "RSI cohérent"]
        : bias === "baissier"
        ? ["Pression vendeuse", "Tendance fragile", "RSI à risque"]
        : ["Signal mitigé", "Attendre confirmation", "Risque de faux départ"];

    const patterns =
      bias === "haussier"
        ? "Marteau, Englobante haussière"
        : bias === "baissier"
        ? "Étoile filante, Englobante baissière"
        : "Aucun pattern fort";

    const signalsDetected =
      bias === "haussier"
        ? "RSI favorable, Momentum ↑, Breakout possible"
        : bias === "baissier"
        ? "RSI fragile, Momentum ↓, Rejet de résistance"
        : "Momentum neutre, Attente de confirmation";

    const topBull = pickTop(safeAssets, "haussier", 2).map((a) => a.ticker);
    const topBear = pickTop(safeAssets, "baissier", 2).map((a) => a.ticker);

    return {
      bias,
      signal,
      confidence,
      slPct: DEFAULT_SL_PCT,
      tpPct: DEFAULT_TP_PCT,
      reasons,
      signalsDetected,
      patterns,
      topBull,
      topBear,
    };
  }, [assets]);

  const halo = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(34,197,94,0.10)", "rgba(34,197,94,0.28)"],
  });

  const borderColor =
    summary.bias === "haussier"
      ? "#22c55e"
      : summary.bias === "baissier"
      ? "#fb7185"
      : "#facc15";

  return (
    <>
      {/* CARD ROBOT */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          setOpen(true);
          setShowWhy(false);
        }}
        style={[styles.card, { borderColor }]}
      >
        <Animated.View style={[styles.halo, { backgroundColor: halo }]} />

        <View style={styles.rowTop}>
          <Text style={styles.botTitle}>🤖 HLO</Text>
          <View style={[styles.pill, { borderColor }]}>
            <Text
              style={[
                styles.pillText,
                summary.bias === "haussier"
                  ? styles.signalBull
                  : summary.bias === "baissier"
                  ? styles.signalBear
                  : styles.signalNeutral,
              ]}
            >
              {loading ? "SCAN…" : `${summary.signal} • ${summary.confidence}%`}
            </Text>
          </View>
        </View>

        <Text style={styles.marketText} numberOfLines={1}>
          {marketName ? `Marché : ${marketName}` : "Marché : -"}
        </Text>

        <Text style={styles.smallHint} numberOfLines={2}>
          {loading ? "Analyse en cours…" : "Tape pour voir les signaux & la gestion du risque."}
        </Text>
      </TouchableOpacity>

      {/* MODAL DETAILS */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.modal}>
          <View style={[styles.modalHeader, { borderColor }]}>
            <Text style={styles.modalTitle}>HLO • Analyse</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* SIGNAL / SL / TP */}
          <View style={styles.section}>
            <Text style={styles.signalLine}>
              <Text style={styles.signalLabel}>Signal : </Text>
              <Text
                style={
                  summary.bias === "haussier"
                    ? styles.signalBull
                    : summary.bias === "baissier"
                    ? styles.signalBear
                    : styles.signalNeutral
                }
              >
                {summary.signal} ({summary.confidence}%)
              </Text>
            </Text>

            <Text style={styles.signalLine}>
              <Text style={styles.signalLabel}>Stop Loss : </Text>
              <Text style={styles.signalBear}>{fmtPct(-summary.slPct)}</Text>
            </Text>

            <Text style={styles.signalLine}>
              <Text style={styles.signalLabel}>Take Profit : </Text>
              <Text style={styles.signalBull}>{fmtPct(summary.tpPct)}</Text>
            </Text>
          </View>

          {/* SIGNAUX DETECTES / PATTERNS (APRÈS ":" COLORE) */}
          <View style={styles.section}>
            <Text style={styles.signalLine}>
              <Text style={styles.sectionLabel}>Signaux détectés : </Text>
              <Text style={afterColonStyle(summary.bias, styles)}>{summary.signalsDetected}</Text>
            </Text>

            <Text style={styles.signalLine}>
              <Text style={styles.sectionLabel}>Patterns de chandeliers : </Text>
              <Text style={afterColonStyle(summary.bias, styles)}>{summary.patterns}</Text>
            </Text>
          </View>

          {/* TOP */}
          <View style={styles.section}>
            <Text style={styles.signalLine}>
              <Text style={styles.sectionLabel}>Top haussier : </Text>
              <Text style={styles.signalBull}>
                {summary.topBull.length ? summary.topBull.join(" • ") : "-"}
              </Text>
            </Text>

            <Text style={styles.signalLine}>
              <Text style={styles.sectionLabel}>Top baissier : </Text>
              <Text style={styles.signalBear}>
                {summary.topBear.length ? summary.topBear.join(" • ") : "-"}
              </Text>
            </Text>
          </View>

          {/* POURQUOI */}
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => setShowWhy((v) => !v)}
              activeOpacity={0.9}
              style={[styles.whyBtn, { borderColor }]}
            >
              <Text
                style={[
                  styles.whyText,
                  summary.bias === "haussier"
                    ? styles.signalBull
                    : summary.bias === "baissier"
                    ? styles.signalBear
                    : styles.signalNeutral,
                ]}
              >
                Pourquoi ?
              </Text>
            </TouchableOpacity>

            {showWhy && (
              <View style={styles.whyBox}>
                {summary.reasons.map((r, i) => (
                  <Text key={i} style={styles.reason}>
                    • {r}
                  </Text>
                ))}
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerHint}>SL/TP en % (gestion du risque rapide).</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#020617",
    padding: 12,
    overflow: "hidden",
  },
  halo: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 999,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  botTitle: { color: "#f9fafb", fontSize: 16, fontWeight: "900" },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#020617",
  },
  pillText: { fontSize: 12, fontWeight: "900" },
  marketText: { marginTop: 6, color: "#cbd5e1", fontSize: 12, fontWeight: "700" },
  smallHint: { marginTop: 4, color: "#94a3b8", fontSize: 11, lineHeight: 15 },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  modal: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 90,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    padding: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
  },
  modalTitle: { color: "#f9fafb", fontSize: 14, fontWeight: "900" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  closeText: { color: "#e5e7eb", fontWeight: "900", fontSize: 14 },

  section: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "rgba(2,6,23,0.8)",
  },

  // ✅ texte partiel coloré fiable RN
  signalLine: { marginTop: 6, fontSize: 13, fontWeight: "800" },
  signalLabel: { color: "#cbd5e1" },
  sectionLabel: { color: "#e5e7eb", fontWeight: "900" },

  signalBull: { color: "#22c55e", fontWeight: "900" },   // vert
  signalBear: { color: "#fb7185", fontWeight: "900" },   // rouge
  signalNeutral: { color: "#94a3b8", fontWeight: "900" },// gris

  whyBtn: {
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
  },
  whyText: { fontWeight: "900" },
  whyBox: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 10,
    backgroundColor: "#020617",
  },
  reason: { color: "#e5e7eb", fontSize: 12, lineHeight: 18, fontWeight: "700" },

  footer: { marginTop: 10, alignItems: "center" },
  footerHint: { color: "#64748b", fontSize: 11, textAlign: "center", fontWeight: "600" },
});
