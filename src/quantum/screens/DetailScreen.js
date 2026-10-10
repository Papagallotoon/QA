import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { C, T } from "../theme";
import { useMarketData } from "../MarketData";
import { CATS } from "../core/signals.js";
import { planFor } from "../model/build";
import PlanCard from "../components/PlanCard";
import { useNews } from "../useNews";
import { newsQuery } from "../universe";
import NewsList from "../components/NewsList";
import Dial from "../components/Dial";
import PriceChart from "../components/PriceChart";

function Card(props) {
  return (
    <View style={[{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16 }, props.style]}>
      {props.children}
    </View>
  );
}

function Label(props) {
  return <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.42)", letterSpacing: 1.4 }, props.style]}>{props.children}</Text>;
}

export default function DetailScreen(props) {
  var st = props.state;
  var md = useMarketData();
  var win = useWindowDimensions();
  var s = md.getAsset(st.detail);
  var pending = !!md.loading[st.detail];
  // les hooks doivent etre appeles avant tout "return" conditionnel,
  // sinon React plante au passage chargement -> affichage
  var news = useNews(st.detail ? newsQuery(st.detail) : null, 6);
  var [planH, setPlanH] = useState(null);
  useEffect(function () { setPlanH(null); }, [st.detail]);

  // une valeur ouverte depuis la recherche n'est pas encore en cache : on la charge
  useEffect(function () {
    if (!s && st.detail && !pending && !md.errors[st.detail]) md.loadSymbol(st.detail);
  }, [st.detail, !!s]);

  if (!s && (pending || !md.errors[st.detail])) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 }}>
        <ActivityIndicator color={C.dim} />
        <Text style={[T.mono(10, "500"), { color: C.dimmer, letterSpacing: 1 }]}>{String(st.detail).toUpperCase()}</Text>
        <Pressable onPress={props.back} hitSlop={12}>
          <Text style={[T.sans(12, "500"), { color: C.dim }]}>Annuler</Text>
        </Pressable>
      </View>
    );
  }

  if (!s || s.error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={[T.sans(13, "500"), { color: C.dim, textAlign: "center" }]}>
          {s && s.error ? s.error : md.errors[st.detail] || "Valeur indisponible."}
        </Text>
        <Pressable onPress={props.back} style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
          <Text style={[T.mono(10), { color: C.text }]}>RETOUR</Text>
        </Pressable>
      </View>
    );
  }

  var dir = s.dir;
  var strongS = s.score >= 53;
  var color = !strongS ? C.flat : dir < 0 ? C.down : C.up;
  var ring = !strongS ? "rgba(232,234,236,0.45)" : dir < 0 ? C.ringDown : C.ringUp;
  var cons = s.cons;
  var watched = st.watch.indexOf(s.id) >= 0;
  var chartW = win.width - 44 - 32;
  var plan = planFor(s, planH);

  function Seg() {
    return (
      <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", padding: 3, borderRadius: 10, gap: 2 }}>
        {[["est", "ESTIMATION"], ["tech", "TECHNIQUE"]].map(function (t) {
          var on = st.detailTab === t[0];
          return (
            <Pressable key={t[0]} onPress={function () { props.setState({ detailTab: t[0] }); }}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 7, backgroundColor: on ? "rgba(255,255,255,0.13)" : "transparent" }}>
              <Text style={[T.mono(10), { color: on ? C.text : C.dim, letterSpacing: 1 }]}>{t[1]}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  var header = (
    <View style={{ paddingHorizontal: 22, gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable onPress={props.back} hitSlop={12} style={{ width: 34, height: 34, marginLeft: -8, alignItems: "center", justifyContent: "center" }}>
          <Text style={[T.sans(20, "500"), { color: "rgba(232,234,236,0.7)" }]}>{"\u2190"}</Text>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[T.sans(17, "600"), { color: C.text }]} numberOfLines={1}>{s.name}</Text>
          <Text style={[T.mono(10, "500"), { color: "rgba(232,234,236,0.4)", letterSpacing: 1, marginTop: 2 }]} numberOfLines={1}>{s.ticker}</Text>
        </View>
        <Pressable onPress={function () { props.toggleWatch(s.id); }}
          style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center",
            borderColor: watched ? "rgba(79,221,154,0.45)" : "rgba(255,255,255,0.14)",
            backgroundColor: watched ? "rgba(79,221,154,0.12)" : "transparent" }}>
          <Text style={{ color: watched ? C.up : C.dim, fontSize: 13 }}>{watched ? "\u25C6" : "\u25C7"}</Text>
        </Pressable>
      </View>
      <Seg />
    </View>
  );

  if (st.detailTab === "tech") {
    var shownRows = st.techCat === "Tous" ? s.tech : s.tech.filter(function (i) { return i.cat === st.techCat; });
    var pw = function (n) { return (n / cons.directional) * 100 + "%"; };
    return (
      <View style={{ flex: 1 }}>
        {header}
        <View style={{ paddingHorizontal: 22, paddingTop: 9 }}>
          <Card>
            <Text style={[T.sans(22, "700"), { color: s.pUp >= 0.54 ? C.up : s.pUp <= 0.46 ? C.down : C.flat, letterSpacing: -0.5 }]}>{cons.verdict}</Text>
            <Text style={[T.mono(10, "500"), { color: "rgba(232,234,236,0.4)", marginTop: 6, marginBottom: 13 }]}>
              {cons.directional + " directionnels - " + cons.info + " informatifs - horizon " + st.horizon}
            </Text>
            <View style={{ flexDirection: "row", height: 26, borderRadius: 7, overflow: "hidden", gap: 2 }}>
              {cons.buy > 0 ? (
                <View style={{ width: pw(cons.buy), backgroundColor: C.ringUp, justifyContent: "center", paddingHorizontal: 9 }}>
                  <Text style={[T.mono(11), { color: C.ink }]}>{cons.buy}</Text>
                </View>
              ) : null}
              {cons.neu > 0 ? (
                <View style={{ width: pw(cons.neu), backgroundColor: "rgba(255,255,255,0.13)", justifyContent: "center", paddingHorizontal: 9 }}>
                  <Text style={[T.mono(11), { color: "rgba(232,234,236,0.7)" }]}>{cons.neu}</Text>
                </View>
              ) : null}
              {cons.sell > 0 ? (
                <View style={{ width: pw(cons.sell), backgroundColor: "rgba(224,92,75,0.55)", justifyContent: "center", alignItems: "flex-end", paddingHorizontal: 9 }}>
                  <Text style={[T.mono(11), { color: C.text }]}>{cons.sell}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Label>ACHAT</Label><Label>NEUTRE</Label><Label>VENTE</Label>
            </View>
          </Card>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 7, alignItems: "center" }} style={{ flexGrow: 0, flexShrink: 0, height: 48, marginTop: 12 }}>
          {CATS.map(function (c) {
            var on = c === st.techCat;
            return (
              <Pressable key={c} onPress={function () { props.setState({ techCat: c }); }}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
                  backgroundColor: on ? C.ringUp : "rgba(255,255,255,0.07)",
                  borderWidth: 1, borderColor: on ? C.ringUp : "rgba(255,255,255,0.22)" }}>
                <Text style={[T.mono(10.5), { color: on ? C.ink : "rgba(232,234,236,0.82)" }]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20, gap: 2 }}>
          {shownRows.map(function (i) {
            var isInfo = i.sig === null || i.sig === undefined;
            var pillBg = isInfo ? "transparent" : i.sig > 0 ? "rgba(79,221,154,0.16)" : i.sig < 0 ? "rgba(224,92,75,0.16)" : "rgba(255,255,255,0.06)";
            var pillCol = isInfo ? C.dimmer : i.sig > 0 ? C.up : i.sig < 0 ? C.down : C.dim;
            var pillTxt = isInfo ? "INFO" : i.sig > 0 ? "ACHAT" : i.sig < 0 ? "VENTE" : "NEUTRE";
            return (
              <View key={i.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: C.borderSoft, borderRadius: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[T.sans(12.5, "500"), { color: C.text, marginBottom: 3 }]}>{i.name}</Text>
                  <Text style={[T.mono(9, "500"), { color: C.dimmer, letterSpacing: 1 }]}>{i.cat}</Text>
                </View>
                <Text style={[T.mono(11.5), { color: "rgba(232,234,236,0.75)" }]}>{i.val}</Text>
                <View style={{ width: 58, alignItems: "center", paddingVertical: 5, borderRadius: 6, backgroundColor: pillBg, borderWidth: isInfo ? 1 : 0, borderColor: "rgba(255,255,255,0.13)", borderStyle: "dashed" }}>
                  <Text style={[T.mono(9), { color: pillCol }]}>{pillTxt}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20, gap: 9 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 11 }}>
          <Text style={[T.sans(30, "700"), { color: C.text, letterSpacing: -0.8 }]}>{s.price}</Text>
          <Text style={[T.mono(13), { color: s.changeRaw >= 0 ? C.up : C.down }]}>{s.change}</Text>
        </View>

        <Card style={{ paddingHorizontal: 16, paddingTop: 13, paddingBottom: 11 }}>
          <PriceChart width={chartW} color={ring} history={s.history} p05={s.mc.p05} p95={s.mc.p95} />
        </Card>

        <Card style={{ flexDirection: "row", alignItems: "center", gap: 18, paddingVertical: 13, paddingHorizontal: 18 }}>
          <Dial size={76} stroke={8} pct={s.score} color={ring}>
            <Text style={[T.sans(19, "700"), { color: color, letterSpacing: -0.6 }]}>{s.score + " %"}</Text>
            <Text style={[T.mono(8, "500"), { color: "rgba(232,234,236,0.42)", letterSpacing: 1.2, marginTop: 3 }]}>{dir < 0 ? "BAISSE" : "HAUSSE"}</Text>
          </Dial>
          <View style={{ flex: 1, gap: 9 }}>
            {[["Attendu (" + st.horizon + ")", s.expected], ["Intervalle 90 %", s.interval], ["Fiabilite mesuree", s.conf]].map(function (r, i) {
              return (
                <View key={r[0]} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[T.sans(11, "400"), { color: C.dim }]}>{r[0]}</Text>
                  <Text style={[T.mono(11), { color: i === 0 ? color : "rgba(232,234,236,0.8)" }]}>{r[1]}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <PlanCard plan={plan} currency={s.currency} onPickHorizon={function (h) { setPlanH(h); }} />

        <Card>
          <Label style={{ marginBottom: 11 }}>POIDS DE CHAQUE FAMILLE DANS LE SCORE</Label>
          <View style={{ gap: 9 }}>
            {s.factors.map(function (f) {
              var pos = f[1] >= 0;
              var w = Math.min(50, Math.abs(f[1]) / 2);
              return (
                <View key={f[0]}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={[T.sans(11.5, "500"), { color: "rgba(232,234,236,0.85)" }]}>{f[0]}</Text>
                    <Text style={[T.mono(10.5), { color: f[1] === 0 ? C.dim : pos ? C.up : C.down }]}>{(pos ? "+" : "-") + Math.abs(f[1])}</Text>
                  </View>
                  <View style={{ flexDirection: "row", height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <View style={{ width: (pos ? 50 : 50 - w) + "%" }} />
                    <View style={{ width: w + "%", backgroundColor: pos ? C.ringUp : C.ringDown, borderRadius: 3 }} />
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" }}>
            <Text style={[T.mono(9, "500"), { color: C.dimmer }]}>{(s._model && s._model.source === "learned" ? "MODELE APPRIS " + (s._model.version || "") : "MODELE PAR DEFAUT") + " / MONTE-CARLO"}</Text>
            <Text style={[T.mono(9, "500"), { color: C.dimmer }]}>{"n=" + s.mc.scenarios.toLocaleString("fr-FR")}</Text>
          </View>
        </Card>

        <Pressable onPress={function () { props.setState({ detailTab: "tech" }); }}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
            <View style={{ flex: 1 }}>
              <Label style={{ marginBottom: 7 }}>ANALYSE TECHNIQUE</Label>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 9 }}>
                <Text style={[T.sans(15, "600"), { color: s.pUp >= 0.54 ? C.up : s.pUp <= 0.46 ? C.down : C.flat }]}>{cons.verdict}</Text>
                <Text style={[T.mono(10, "500"), { color: "rgba(232,234,236,0.4)" }]}>{cons.directional + " directionnels"}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 5 }}>
              <Text style={[T.mono(11), { color: C.up }]}>{cons.buy}</Text>
              <Text style={[T.mono(11, "500"), { color: C.dimmer }]}>/</Text>
              <Text style={[T.mono(11), { color: "rgba(232,234,236,0.55)" }]}>{cons.neu}</Text>
              <Text style={[T.mono(11, "500"), { color: C.dimmer }]}>/</Text>
              <Text style={[T.mono(11), { color: C.down }]}>{cons.sell}</Text>
            </View>
            <Text style={[T.sans(16, "500"), { color: "rgba(232,234,236,0.3)" }]}>{"\u203A"}</Text>
          </Card>
        </Pressable>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 }}>
            <View style={{ width: 6, height: 6, backgroundColor: C.ringUp, transform: [{ rotate: "45deg" }] }} />
            <Label>{s.sectorLabel}</Label>
          </View>
          <Text style={[T.sans(11.5, "400"), { color: "rgba(232,234,236,0.68)", lineHeight: 17, marginBottom: 12 }]}>{s.sector}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[["VOLATILITE", s.vol], ["BETA", s.beta], ["CORREL.", s.corr]].map(function (k) {
              return (
                <View key={k[0]} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8 }}>
                  <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.38)", marginBottom: 3 }]}>{k[0]}</Text>
                  <Text style={[T.sans(13, "600"), { color: C.text }]}>{k[1]}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={{ marginTop: 6, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Label>ACTUALITES LIEES</Label>
            <Text style={[T.mono(9, "500"), { color: C.dimmer, letterSpacing: 1 }]}>PRESSE FR</Text>
          </View>
          <NewsList items={news.items} loading={news.loading} error={news.error} limit={6} />
        </View>

        <Text style={[T.sans(10, "400"), { color: C.dim, textAlign: "center", lineHeight: 14, paddingVertical: 4 }]}>
          Information statistique - ne constitue pas un conseil en investissement.
        </Text>
      </ScrollView>
    </View>
  );
}
