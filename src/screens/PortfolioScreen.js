// src/screens/PortfolioScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { fetchDailyCandles } from "../api/marketData";
import { analyzeCandles } from "../analysis/engine";

export default function PortfolioScreen() {
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [entry, setEntry] = useState("");
  const [positions, setPositions] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  async function addPosition() {
    const s = symbol.trim().toUpperCase();
    const q = parseFloat(qty.replace(",", "."));
    const e = parseFloat(entry.replace(",", "."));
    if (!s || !q || !e) return;

    const id = Date.now().toString();
    setLoadingId(id);

    try {
      const candles = await fetchDailyCandles(s);
      const analysis = analyzeCandles(candles);
      const lastPrice = analysis?.indicators?.lastPrice ?? e;
      const currentValue = lastPrice * q;
      const invested = e * q;
      const pnl = currentValue - invested;
      const pnlPct = invested ? (pnl / invested) * 100 : 0;

      setPositions((prev) => [
        ...prev,
        {
          id,
          symbol: s,
          qty: q,
          entryPrice: e,
          lastPrice,
          pnl,
          pnlPct,
        },
      ]);
      setSymbol("");
      setQty("");
      setEntry("");
    } catch (e) {
      // En prod : gestion d’erreur user-friendly
    } finally {
      setLoadingId(null);
    }
  }

  function computeAggregates() {
    return positions.reduce(
      (acc, p) => {
        const invested = p.entryPrice * p.qty;
        const current = p.lastPrice * p.qty;
        acc.invested += invested;
        acc.current += current;
        acc.pnl += current - invested;
        return acc;
      },
      { invested: 0, current: 0, pnl: 0 }
    );
  }

  const agg = computeAggregates();
  const totalPnlPct =
    agg.invested > 0 ? (agg.pnl / agg.invested) * 100 : 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Portefeuille</Text>
        <Text style={styles.subtitle}>
          Suivi simple de tes positions : coût, valeur actuelle, PnL et
          performance globale.
        </Text>
      </View>

      {/* Résumé global */}
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Vue d’ensemble</Text>
        <Text style={styles.line}>
          Investi :{" "}
          <Text style={styles.value}>
            {agg.invested.toFixed(2)} $
          </Text>
        </Text>
        <Text style={styles.line}>
          Valeur actuelle :{" "}
          <Text style={styles.value}>
            {agg.current.toFixed(2)} $
          </Text>
        </Text>
        <Text style={styles.line}>
          PnL total :{" "}
          <Text
            style={[
              styles.value,
              { color: agg.pnl >= 0 ? "#4ade80" : "#fb7185" },
            ]}
          >
            {agg.pnl.toFixed(2)} $ ({totalPnlPct.toFixed(2)}%)
          </Text>
        </Text>
      </View>

      {/* Formulaire ajout position */}
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Ajouter une position</Text>
        <TextInput
          value={symbol}
          onChangeText={setSymbol}
          placeholder="Ticker (ex : AAPL, TSLA, AIR.PA)"
          placeholderTextColor="#6b7280"
          style={styles.input}
          autoCapitalize="characters"
        />
        <TextInput
          value={qty}
          onChangeText={setQty}
          placeholder="Quantité"
          placeholderTextColor="#6b7280"
          style={styles.input}
          keyboardType="numeric"
        />
        <TextInput
          value={entry}
          onChangeText={setEntry}
          placeholder="Prix d’entrée"
          placeholderTextColor="#6b7280"
          style={styles.input}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={styles.btn}
          onPress={addPosition}
          disabled={!!loadingId}
        >
          <Text style={styles.btnText}>
            {loadingId ? "Ajout en cours…" : "Ajouter"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des positions */}
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Positions</Text>
        {!positions.length ? (
          <Text style={styles.line}>
            Aucune position pour le moment.
          </Text>
        ) : (
          positions.map((p) => (
            <View key={p.id} style={styles.positionCard}>
              <View style={styles.positionHeader}>
                <Text style={styles.symbol}>{p.symbol}</Text>
                <Text
                  style={[
                    styles.pnl,
                    { color: p.pnl >= 0 ? "#4ade80" : "#fb7185" },
                  ]}
                >
                  {p.pnl.toFixed(2)} $ ({p.pnlPct.toFixed(2)}%)
                </Text>
              </View>
              <Text style={styles.positionLine}>
                Qté :{" "}
                <Text style={styles.value}>{p.qty}</Text>
              </Text>
              <Text style={styles.positionLine}>
                Entrée :{" "}
                <Text style={styles.value}>
                  {p.entryPrice.toFixed(2)} $
                </Text>
              </Text>
              <Text style={styles.positionLine}>
                Prix actuel :{" "}
                <Text style={styles.value}>
                  {p.lastPrice.toFixed(2)} $
                </Text>
              </Text>
            </View>
          ))
        )}
      </View>
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    color: "#f9fafb",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 13,
    lineHeight: 18,
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
  blockTitle: {
    color: "#f9fafb",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 8,
  },
  line: {
    color: "#9ca3af",
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  input: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#f9fafb",
    fontSize: 13,
    marginBottom: 8,
    backgroundColor: "#020617",
  },
  btn: {
    borderRadius: 999,
    backgroundColor: "#22c55e",
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    color: "#020617",
    fontWeight: "700",
    fontSize: 13,
  },
  positionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#020617",
  },
  positionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  symbol: {
    color: "#f9fafb",
    fontSize: 15,
    fontWeight: "700",
  },
  pnl: {
    fontSize: 13,
    fontWeight: "700",
  },
  positionLine: {
    color: "#9ca3af",
    fontSize: 12,
  },
});
