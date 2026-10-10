import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { C, T } from "../theme";
import { LEXICON, LEX_CATS } from "../lexicon";

function norm(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function LexiconScreen() {
  var [cat, setCat] = useState("Tous");
  var [q, setQ] = useState("");
  var [open, setOpen] = useState(null);

  var list = LEXICON.filter(function (e) {
    if (cat !== "Tous" && e.c !== cat) return false;
    if (!q.trim()) return true;
    var n = norm(q);
    return norm(e.t).indexOf(n) >= 0 || norm(e.s).indexOf(n) >= 0 || norm(e.l).indexOf(n) >= 0;
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 22, gap: 12 }}>
        <Text style={[T.sans(26, "700"), { color: C.text, letterSpacing: -0.6 }]}>Lexique</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14 }}>
          <Text style={[T.sans(13), { color: C.dimmer }]}>{"\u2315"}</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Chercher un terme"
            placeholderTextColor="rgba(232,234,236,0.3)"
            style={[T.sans(13, "400"), { color: C.text, flex: 1, paddingVertical: 12 }]}
          />
          {q ? (
            <Pressable onPress={function () { setQ(""); }} hitSlop={10}>
              <Text style={[T.sans(14), { color: C.dimmer }]}>{"\u00D7"}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 7, alignItems: "center" }} style={{ flexGrow: 0, flexShrink: 0, height: 48, marginTop: 12 }}>
        {LEX_CATS.map(function (c) {
          var on = c === cat;
          return (
            <Pressable key={c} onPress={function () { setCat(c); }}
              style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
                backgroundColor: on ? C.ringUp : "rgba(255,255,255,0.07)",
                borderWidth: 1, borderColor: on ? C.ringUp : "rgba(255,255,255,0.22)" }}>
              <Text style={[T.mono(10.5), { color: on ? C.ink : "rgba(232,234,236,0.82)" }]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20, gap: 8 }}>
        <Text style={[T.mono(10, "500"), { color: C.dimmer, letterSpacing: 1.2, marginBottom: 2 }]}>
          {list.length + (list.length > 1 ? " ENTREES" : " ENTREE")}
        </Text>

        {list.map(function (e) {
          var isOpen = open === e.t;
          return (
            <Pressable key={e.t} onPress={function () { setOpen(isOpen ? null : e.t); }}
              style={{ backgroundColor: C.card, borderWidth: 1, borderColor: isOpen ? "rgba(79,221,154,0.28)" : C.border, borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                {e.em ? <Text style={{ fontSize: 20, marginTop: 1 }}>{e.em}</Text> : null}
                <View style={{ flex: 1 }}>
                  <Text style={[T.sans(14, "600"), { color: C.text, marginBottom: 5 }]}>{e.t}</Text>
                  <Text style={[T.sans(11.5, "400"), { color: C.dim, lineHeight: 17 }]}>{e.s}</Text>
                </View>
                <Text style={[T.sans(13, "500"), { color: isOpen ? C.up : "rgba(232,234,236,0.3)", marginTop: 2 }]}>
                  {isOpen ? "\u2212" : "+"}
                </Text>
              </View>

              {isOpen ? (
                <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", gap: 12 }}>
                  <View>
                    <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.42)", letterSpacing: 1.4, marginBottom: 7 }]}>COMMENT LE LIRE</Text>
                    <Text style={[T.sans(12, "400"), { color: "rgba(232,234,236,0.75)", lineHeight: 19 }]}>{e.l}</Text>
                  </View>
                  {e.e ? (
                    <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 11, padding: 12 }}>
                      <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.38)", letterSpacing: 1.2, marginBottom: 6 }]}>EXEMPLE</Text>
                      <Text style={[T.sans(11.5, "400"), { color: "rgba(232,234,236,0.7)", lineHeight: 17 }]}>{e.e}</Text>
                    </View>
                  ) : null}
                  <Text style={[T.mono(9, "500"), { color: C.dimmer, letterSpacing: 1 }]}>{e.c.toUpperCase()}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        {list.length === 0 ? (
          <View style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderStyle: "dashed", borderRadius: 16, padding: 24, alignItems: "center" }}>
            <Text style={[T.sans(12.5, "500"), { color: C.dim }]}>Aucun terme trouve</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
