import React from "react";
import { View, Text, Pressable } from "react-native";
import { C, T } from "../theme";
import Sparkline from "./Sparkline";

export default function StockRow(props) {
  var s = props.stock;
  var dir = s.dir || 1;
  var strong = s.score >= 53;
  var color = !strong ? C.flat : dir < 0 ? C.down : C.up;
  var ring = !strong ? "rgba(232,234,236,0.35)" : dir < 0 ? C.ringDown : C.ringUp;
  return (
    <Pressable onPress={props.onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: ring, alignItems: "center", justifyContent: "center" }}>
        <Text style={[T.mono(11), { color: color }]}>{s.score}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[T.sans(14, "600"), { color: C.text, marginBottom: 3 }]} numberOfLines={1}>{s.name}</Text>
        <Text style={[T.sans(11, "400"), { color: C.dim }]} numberOfLines={1}>{s.sub}</Text>
      </View>
      <Sparkline seed={s.id} history={s.history} color={ring} />
      <Text style={[T.sans(16, "500"), { color: "rgba(232,234,236,0.3)" }]}>{"\u203A"}</Text>
    </Pressable>
  );
}
