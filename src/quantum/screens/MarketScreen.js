import React from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { C, T } from "../theme";
import { INDEX_DEFS } from "../universe";
import { useIndexData, useMarketData } from "../MarketData";
import SearchBar from "../components/SearchBar";
import SwipePager from "../components/SwipePager";
import Dial from "../components/Dial";
import StockRow from "../components/StockRow";

export default function MarketScreen(props) {
  var st = props.state;
  var def = INDEX_DEFS.filter(function (i) { return i.id === st.index; })[0] || INDEX_DEFS[0];
  var data = useIndexData(st.index);
  var md = useMarketData();

  var pos = INDEX_DEFS.findIndex(function (i) { return i.id === st.index; });
  if (pos < 0) pos = 0;

  function goTo(delta) {
    var next = (pos + delta + INDEX_DEFS.length) % INDEX_DEFS.length;
    props.setState({ index: INDEX_DEFS[next].id });
  }

  function openSearched(symbol) {
    props.open(symbol);
    md.loadSymbol(symbol);
  }

  // un indice en erreur (symbole inconnu, historique trop court) ne doit rien afficher
  var idx = data.index && !data.index.error ? data.index : null;
  var idxError = data.error || (data.index && data.index.error ? data.index.error : null);

  var score = idx ? idx.score : 0;
  var dir = idx ? idx.dir : 1;
  // entre 47 et 53 % : pas d'avis, affiche en neutre
  var neutral = idx ? Math.abs(idx.pUp - 0.5) < 0.03 : true;
  var color = neutral ? C.flat : dir > 0 ? C.up : C.down;
  var ring = neutral ? "rgba(232,234,236,0.45)" : dir > 0 ? C.ringUp : C.ringDown;

  var rows = data.assets.slice().sort(function (a, b) {
    return st.sortByScore ? b.score - a.score : a.name.localeCompare(b.name);
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, marginBottom: 14 }}>
        <Text style={[T.mono(11), { color: "rgba(232,234,236,0.55)", letterSpacing: 1.8 }]}>QUANTUM ALGO</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: idx && idx.marketState === "REGULAR" ? C.ringUp : "rgba(232,234,236,0.4)" }} />
          <Text style={[T.mono(10), { color: "rgba(232,234,236,0.7)", letterSpacing: 1 }]}>
            {idx && idx.marketState === "REGULAR" ? "OUVERT" : "FERME"}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 22, marginBottom: 14, zIndex: 20 }}>
        <SearchBar onSelect={openSearched} />
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
        refreshControl={<RefreshControl refreshing={data.loading} onRefresh={data.refresh} tintColor={C.dim} />}
      >
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <Dial size={178} stroke={17} pct={idx ? score : 0} color={ring}>
            <Text style={[T.mono(9), { color: "rgba(232,234,236,0.42)", letterSpacing: 1.6 }]}>
              {(def.list ? "CAC 40" : def.label) + " / " + st.horizon}
            </Text>
            {idx ? (
              <>
                <Text style={[T.sans(44, "700"), { color: color, letterSpacing: -1.6, marginTop: 2 }]}>{score + " %"}</Text>
                <Text style={[T.mono(10, "500"), { color: C.dim, marginTop: 2 }]}>{neutral ? (dir > 0 ? "de hausse - neutre" : "de baisse - neutre") : dir > 0 ? "de hausse" : "de baisse"}</Text>
              </>
            ) : data.loading ? (
              <ActivityIndicator color={C.dim} style={{ marginTop: 12 }} />
            ) : (
              <Text style={[T.sans(30, "700"), { color: C.dimmer, marginTop: 6 }]}>{"\u2014"}</Text>
            )}
          </Dial>
        </View>

        {idx ? (
          <Text style={[T.mono(11), { color: C.dim, textAlign: "center", marginBottom: 10 }]}>
            {idx.price + "   " + idx.change}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", alignSelf: "center", backgroundColor: "rgba(255,255,255,0.06)", padding: 4, borderRadius: 13, gap: 4, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
          {[["1J", "1 J"], ["1S", "1 SEM."], ["1M", "1 MOIS"], ["3M", "3 MOIS"]].map(function (h) {
            var on = h[0] === st.horizon;
            return (
              <Pressable key={h[0]} onPress={function () { props.setState({ horizon: h[0] }); }}
                style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10,
                  backgroundColor: on ? C.ringUp : "transparent" }}>
                <Text style={[T.mono(11, "600"), { color: on ? C.ink : "rgba(232,234,236,0.62)", letterSpacing: 0.8 }]}>
                  {h[1]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[T.sans(10.5, "400"), { color: "rgba(232,234,236,0.38)", textAlign: "center", lineHeight: 16, paddingHorizontal: 20, marginBottom: 20 }]}>
          {"Probabilite calibree sur l'historique reel, " + st.sims.toLocaleString("fr-FR") + " scenarios simules - information statistique, pas un conseil"}
        </Text>

        {idxError ? (
          <View style={{ borderWidth: 1, borderColor: "rgba(224,92,75,0.4)", backgroundColor: "rgba(224,92,75,0.08)", borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <Text style={[T.sans(12, "600"), { color: C.down, marginBottom: 5 }]}>Donnees indisponibles</Text>
            <Text style={[T.sans(11, "400"), { color: C.dim, lineHeight: 16 }]}>
              {def.label + " : " + idxError}
            </Text>
            <Pressable onPress={data.refresh} style={{ marginTop: 12, alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border }}>
              <Text style={[T.mono(10), { color: C.text }]}>REESSAYER</Text>
            </Pressable>
          </View>
        ) : null}

        {def.note ? (
          <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: C.borderSoft, borderRadius: 14, padding: 13, marginBottom: 14 }}>
            <Text style={[T.sans(11.5, "400"), { color: "rgba(232,234,236,0.6)", lineHeight: 17 }]}>
              {def.note + ". Le cadran ci-dessus reprend l'estimation du CAC 40, indice de reference de ces valeurs."}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={[T.mono(10, "500"), { color: C.dim, letterSpacing: 1.4 }]}>
            {(def.list ? "VALEURS " : "VALEURS DU ") + def.name.toUpperCase()}
          </Text>
          <Pressable onPress={function () { props.setState({ sortByScore: !st.sortByScore }); }}>
            <Text style={[T.mono(10, "500"), { color: "rgba(232,234,236,0.4)" }]}>{st.sortByScore ? "CONVICTION" : "A - Z"}</Text>
          </Pressable>
        </View>

        {data.loading && rows.length === 0 ? (
          <ActivityIndicator color={C.dim} style={{ marginTop: 20 }} />
        ) : (
          <View style={{ gap: 8 }}>
            {rows.map(function (s) {
              return <StockRow key={s.id} stock={s} onPress={function () { props.open(s.id); }} />;
            })}
          </View>
        )}
      </ScrollView>
      </SwipePager>

    </View>
  );
}
