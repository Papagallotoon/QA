import React from "react";
import { View, Text, Pressable } from "react-native";
import { C, T } from "../theme";

export default function IndexNav(props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, marginBottom: 12 }}>
      <Pressable onPress={props.onPrev} hitSlop={10}
        style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
        <Text style={[T.sans(15, "500"), { color: "rgba(232,234,236,0.7)" }]}>{"\u2039"}</Text>
      </Pressable>

      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={[T.sans(15, "600"), { color: C.text }]}>{props.label}</Text>
        <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.35)", letterSpacing: 1, marginTop: 3 }]}>
          {props.sub}
        </Text>
      </View>

      <Pressable onPress={props.onNext} hitSlop={10}
        style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
        <Text style={[T.sans(15, "500"), { color: "rgba(232,234,236,0.7)" }]}>{"\u203A"}</Text>
      </Pressable>
    </View>
  );
}
