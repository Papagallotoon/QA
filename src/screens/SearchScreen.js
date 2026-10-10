// src/screens/SearchScreen.js
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SBF120 } from "../data/sbf120"; // <= notre liste complète SBF 120

// On enrichit un peu les entrées pour la recherche
const INDEX = SBF120.map((item) => ({
  ...item,
  searchable: `${item.symbol} ${item.name}`.toUpperCase(),
}));

// Fuzzy très simple : toutes les lettres de q doivent apparaître dans l’ordre
// dans la cible (pratique pour LV -> LVMH)
function fuzzyMatch(query, target) {
  const q = query.toUpperCase().replace(/\s+/g, "");
  if (!q) return false;
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    ti = target.indexOf(ch, ti);
    if (ti === -1) return false;
    ti++;
  }
  return true;
}

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const upper = q.toUpperCase();

    // 1) match direct symbole ou nom contient la chaîne
    const direct = INDEX.filter(
      (item) =>
        item.symbol.toUpperCase().includes(upper) ||
        item.name.toUpperCase().includes(upper)
    );

    // 2) fuzzy (LV -> LVMH, SF -> SAFRAN, etc.)
    const fuzzy = INDEX.filter(
      (item) =>
        !direct.includes(item) && fuzzyMatch(upper, item.searchable)
    );

    // On limite à 40 résultats pour garder la liste légère
    return [...direct, ...fuzzy].slice(0, 40);
  }, [query]);

  const onSelect = (item) => {
    navigation.navigate("TickerDetail", {
      ticker: item.symbol,
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultRow}
      activeOpacity={0.8}
      onPress={() => onSelect(item)}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.resultMain}>
          {item.symbol} - {item.name}
        </Text>
        <Text style={styles.resultSub}>SBF 120 • Paris</Text>
      </View>
      <Text style={styles.resultChevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Recherche SBF 120</Text>
        <Text style={styles.subtitle}>
          Tape un nom, un symbole, ou même des initiales (ex :{" "}
          <Text style={{ fontWeight: "600" }}>LV</Text> pour LVMH).
        </Text>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchWrapper}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Exemples : AIRBUS, LVMH, BNP, SANOFI…"
          placeholderTextColor="#64748b"
          style={styles.searchInput}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      {/* Suggestions par défaut si aucun texte */}
      {!query.trim() ? (
        <View style={styles.hintBlock}>
          <Text style={styles.hintTitle}>Suggestions rapides</Text>
          <View style={styles.hintRow}>
            {["AIR.PA", "MC.PA", "BNP.PA", "SAN.PA", "SU.PA"].map(
              (sym) => {
                const found = INDEX.find((x) => x.symbol === sym);
                if (!found) return null;
                return (
                  <TouchableOpacity
                    key={sym}
                    style={styles.hintChip}
                    onPress={() => onSelect(found)}
                  >
                    <Text style={styles.hintChipText}>
                      {found.symbol}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
          <Text style={styles.hintText}>
            Le moteur est limité au SBF 120 pour l’instant. Chaque valeur
            ouvre une page complète avec graphique, RSI, moyennes mobiles
            et score du bot.
          </Text>
        </View>
      ) : null}

      {/* Résultats */}
      {query.trim() ? (
        results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.symbol}
            renderItem={renderItem}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>
              Aucune valeur trouvée
            </Text>
            <Text style={styles.emptyText}>
              Vérifie l’orthographe ou essaye juste une partie du nom
              (ex : “AIR”, “BNP”, “KER”).
            </Text>
          </View>
        )
      ) : null}
    </View>
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
    paddingBottom: 8,
  },
  title: {
    color: "#f9fafb",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 12,
    lineHeight: 17,
  },

  searchWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  searchInput: {
    color: "#e5e7eb",
    fontSize: 14,
    paddingVertical: 6,
  },

  hintBlock: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#020617",
  },
  hintTitle: {
    color: "#f9fafb",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 6,
  },
  hintRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  hintChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginRight: 6,
    marginBottom: 6,
  },
  hintChipText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "600",
  },
  hintText: {
    color: "#9ca3af",
    fontSize: 12,
  },

  list: {
    marginTop: 4,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0b1120",
  },
  resultMain: {
    color: "#e5e7eb",
    fontSize: 14,
    fontWeight: "600",
  },
  resultSub: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  resultChevron: {
    color: "#64748b",
    fontSize: 18,
    marginLeft: 8,
  },

  emptyBlock: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#020617",
  },
  emptyTitle: {
    color: "#f9fafb",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 12,
  },
});
