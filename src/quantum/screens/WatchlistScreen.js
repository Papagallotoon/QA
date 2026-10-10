import React, { useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { C, T } from "../theme";
import { useMarketData } from "../MarketData";
import StockRow from "../components/StockRow";

export default function WatchlistScreen(props) {
  var md = useMarketData();

  // les valeurs suivies hors indice courant doivent etre chargees pour s'afficher
  useEffect(function () {
    props.state.watch.forEach(function (sym) {
      if (!md.getAsset(sym) && !md.loading[sym] && !md.errors[sym]) md.loadSymbol(sym);
    });
  }, [props.state.watch.join(",")]);

  var items = props.state.watch
    .map(function (s) { return md.getAsset(s); })
    .filter(function (a) { return a && !a.error; });

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20, gap: 12 }}>
      <Text style={[T.sans(26, "700"), { color: C.text, letterSpacing: -0.6 }]}>Ma liste</Text>
      {items.length === 0 ? (
        <View style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", borderStyle: "dashed", borderRadius: 18, paddingVertical: 34, paddingHorizontal: 24, alignItems: "center" }}>
          <Text style={[T.sans(14, "600"), { color: C.text, marginBottom: 7 }]}>Aucune valeur suivie</Text>
          <Text style={[T.sans(11.5, "400"), { color: C.dim, textAlign: "center", lineHeight: 17 }]}>
            Ouvre une valeur et touche le losange en haut a droite pour la suivre.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {items.map(function (s) {
            return <StockRow key={s.id} stock={s} onPress={function () { props.open(s.id); }} />;
          })}
        </View>
      )}
    </ScrollView>
  );
}
