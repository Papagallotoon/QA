import React from "react";
import { View, Text, Pressable, Image, Linking, ActivityIndicator } from "react-native";
import { C, T } from "../theme";
import { timeAgo } from "../api/news";

export function NewsItem(props) {
  var n = props.item;
  return (
    <Pressable
      onPress={function () { Linking.openURL(n.link).catch(function () {}); }}
      style={{ flexDirection: "row", gap: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 14 }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[T.sans(13, "600"), { color: C.text, lineHeight: 18, marginBottom: 7 }]} numberOfLines={3}>
          {n.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[T.mono(9, "500"), { color: C.dimmer, letterSpacing: 0.8 }]} numberOfLines={1}>
            {(n.publisher || "").toUpperCase()}
          </Text>
          {n.time ? (
            <>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(232,234,236,0.25)" }} />
              <Text style={[T.mono(9, "500"), { color: C.dimmer }]}>{timeAgo(n.time)}</Text>
            </>
          ) : null}
        </View>
      </View>
      {n.thumb ? (
        <Image source={{ uri: n.thumb }} style={{ width: 62, height: 62, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)" }} />
      ) : (
        <Text style={[T.sans(15, "500"), { color: "rgba(232,234,236,0.25)", marginTop: 2 }]}>{"\u2197"}</Text>
      )}
    </Pressable>
  );
}

export default function NewsList(props) {
  if (props.loading && !props.items.length) {
    return <ActivityIndicator color={C.dim} style={{ marginTop: 18 }} />;
  }
  if (props.error && !props.items.length) {
    return (
      <View style={{ borderWidth: 1, borderColor: "rgba(224,92,75,0.35)", backgroundColor: "rgba(224,92,75,0.07)", borderRadius: 16, padding: 16 }}>
        <Text style={[T.sans(12, "500"), { color: C.down, marginBottom: 4 }]}>Actualites indisponibles</Text>
        <Text style={[T.sans(11, "400"), { color: C.dim, lineHeight: 16 }]}>{props.error}</Text>
      </View>
    );
  }
  if (!props.items.length) {
    return (
      <View style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderStyle: "dashed", borderRadius: 16, padding: 20, alignItems: "center" }}>
        <Text style={[T.sans(12, "500"), { color: C.dim }]}>Aucune actualite recente</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {props.items.slice(0, props.limit || 50).map(function (n) {
        return <NewsItem key={n.id} item={n} />;
      })}
    </View>
  );
}
