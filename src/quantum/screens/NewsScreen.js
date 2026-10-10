import React from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { C, T } from "../theme";
import { INDEX_DEFS, COMPONENTS, INDEX_QUERY, newsQuery } from "../universe";
import { useNews } from "../useNews";
import NewsList from "../components/NewsList";
import SwipePager from "../components/SwipePager";

export default function NewsScreen(props) {
  var st = props.state;
  var def = INDEX_DEFS.filter(function (i) { return i.id === st.index; })[0] || INDEX_DEFS[0];
  var queries = [INDEX_QUERY[st.index] || def.label + " bourse"]
    .concat((COMPONENTS[st.index] || []).slice(0, 4).map(newsQuery));
  var news = useNews(queries);

  var pos = INDEX_DEFS.findIndex(function (i) { return i.id === st.index; });
  if (pos < 0) pos = 0;

  function goTo(delta) {
    var next = (pos + delta + INDEX_DEFS.length) % INDEX_DEFS.length;
    props.setState({ index: INDEX_DEFS[next].id });
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 22, marginBottom: 12 }}>
        <Text style={[T.sans(26, "700"), { color: C.text, letterSpacing: -0.6 }]}>Actualites</Text>
        <Text style={[T.sans(12, "400"), { color: C.dim, marginTop: 4 }]}>{def.label + " et ses principales valeurs"}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 7, alignItems: "center" }} style={{ flexGrow: 0, flexShrink: 0, height: 46, marginBottom: 12 }}>
        {INDEX_DEFS.map(function (i) {
          var on = i.id === st.index;
          return (
            <Pressable key={i.id} onPress={function () { props.setState({ index: i.id }); }}
              style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
                backgroundColor: on ? C.ringUp : "rgba(255,255,255,0.07)",
                borderWidth: 1, borderColor: on ? C.ringUp : "rgba(255,255,255,0.22)" }}>
              <Text style={[T.mono(10.5), { color: on ? C.ink : "rgba(232,234,236,0.82)" }]}>{i.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SwipePager canPrev canNext onPrev={function () { goTo(-1); }} onNext={function () { goTo(1); }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={news.loading} onRefresh={news.refresh} tintColor={C.dim} />}
      >
        <NewsList items={news.items} loading={news.loading} error={news.error} />
        <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.22)", textAlign: "center", letterSpacing: 1, marginTop: 16 }]}>
          SOURCES DE PRESSE FRANCAISES
        </Text>
      </ScrollView>
      </SwipePager>

    </View>
  );
}
