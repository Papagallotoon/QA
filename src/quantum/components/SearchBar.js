import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { C, T } from "../theme";
import { searchSymbols } from "../api/search";

export default function SearchBar(props) {
  var [q, setQ] = useState("");
  var [results, setResults] = useState([]);
  var [busy, setBusy] = useState(false);
  var [err, setErr] = useState(null);
  var timer = useRef(null);
  var alive = useRef(true);

  useEffect(function () {
    alive.current = true;
    return function () { alive.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);

  function onChange(text) {
    setQ(text);
    setErr(null);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 1) { setResults([]); setBusy(false); return; }
    setBusy(true);
    // on attend une pause de frappe avant d'interroger le reseau
    timer.current = setTimeout(function () {
      searchSymbols(text)
        .then(function (r) { if (alive.current) { setResults(r); setBusy(false); } })
        .catch(function (e) { if (alive.current) { setErr(e.message || String(e)); setBusy(false); } });
    }, 280);
  }

  function clear() {
    setQ("");
    setResults([]);
    setErr(null);
    setBusy(false);
  }

  function choose(r) {
    clear();
    props.onSelect(r.symbol);
  }

  var open = q.trim().length >= 1;

  return (
    <View style={{ zIndex: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: open ? "rgba(79,221,154,0.3)" : C.border, borderRadius: 14, paddingHorizontal: 14 }}>
        <Text style={[T.sans(13), { color: C.dimmer }]}>{"\u2315"}</Text>
        <TextInput
          value={q}
          onChangeText={onChange}
          placeholder="Chercher une valeur ou un symbole"
          placeholderTextColor="rgba(232,234,236,0.32)"
          autoCorrect={false}
          autoCapitalize="characters"
          returnKeyType="search"
          style={[T.sans(13, "400"), { color: C.text, flex: 1, paddingVertical: 11 }]}
        />
        {busy ? <ActivityIndicator size="small" color={C.dim} /> : null}
        {q ? (
          <Pressable onPress={clear} hitSlop={12}>
            <Text style={[T.sans(15), { color: C.dimmer }]}>{"\u00D7"}</Text>
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <View style={{ marginTop: 8, backgroundColor: "#11161d", borderWidth: 1, borderColor: C.border, borderRadius: 14, overflow: "hidden" }}>
          {err ? (
            <Text style={[T.sans(11.5, "400"), { color: C.down, padding: 14 }]}>{err}</Text>
          ) : results.length === 0 && !busy ? (
            <Text style={[T.sans(11.5, "400"), { color: C.dim, padding: 14 }]}>Aucun resultat</Text>
          ) : (
            results.slice(0, 8).map(function (r, i) {
              return (
                <Pressable key={r.symbol} onPress={function () { choose(r); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "rgba(255,255,255,0.05)" }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[T.sans(13, "600"), { color: C.text, marginBottom: 3 }]} numberOfLines={1}>{r.name}</Text>
                    <Text style={[T.mono(9.5, "500"), { color: C.dimmer, letterSpacing: 0.8 }]} numberOfLines={1}>
                      {r.symbol + "  \u00B7  " + r.exchange}
                    </Text>
                  </View>
                  <Text style={[T.mono(9), { color: C.dim, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }]}>
                    {r.type.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}
