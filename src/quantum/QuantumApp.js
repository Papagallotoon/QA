import React, { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BrainProvider } from "./Brain";
import TrustScreen from "./screens/TrustScreen";
import { View, Text, Pressable, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, T } from "./theme";
import { MarketDataProvider } from "./MarketData";
import MarketScreen from "./screens/MarketScreen";
import DetailScreen from "./screens/DetailScreen";
import WatchlistScreen from "./screens/WatchlistScreen";
import NewsScreen from "./screens/NewsScreen";
import LexiconScreen from "./screens/LexiconScreen";
import SettingsScreen from "./screens/SettingsScreen";

var TABS = [
  { id: "market", label: "INDICES", shape: "circle" },
  { id: "news", label: "ACTUS", shape: "lines" },
  { id: "watch", label: "MA LISTE", shape: "diamond" },
  { id: "trust", label: "BILAN", shape: "chart" },
  { id: "lexicon", label: "LEXIQUE", shape: "square" },
  { id: "settings", label: "REGLAGES", shape: "bars" },
];

function TabIcon(props) {
  var c = props.color;
  if (props.shape === "lines") {
    return (
      <View style={{ width: 14, gap: 2.5, alignItems: "flex-start" }}>
        <View style={{ height: 1.5, width: 14, backgroundColor: c }} />
        <View style={{ height: 1.5, width: 10, backgroundColor: c }} />
        <View style={{ height: 1.5, width: 13, backgroundColor: c }} />
        <View style={{ height: 1.5, width: 8, backgroundColor: c }} />
      </View>
    );
  }
  if (props.shape === "chart") {
    return (
      <View style={{ width: 14, height: 14, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
        <View style={{ width: 3, height: 6, backgroundColor: c }} />
        <View style={{ width: 3, height: 10, backgroundColor: c }} />
        <View style={{ width: 3, height: 14, backgroundColor: c }} />
      </View>
    );
  }
  if (props.shape === "bars") {
    return (
      <View style={{ width: 14, gap: 2.5 }}>
        <View style={{ height: 1.5, backgroundColor: c }} />
        <View style={{ height: 1.5, backgroundColor: c }} />
        <View style={{ height: 1.5, backgroundColor: c }} />
      </View>
    );
  }
  var base = { width: 14, height: 14 };
  if (props.shape === "circle") base.borderRadius = 7;
  if (props.shape === "square") base.borderRadius = 3;
  if (props.shape === "diamond") { base.width = 13; base.height = 13; base.transform = [{ rotate: "45deg" }]; }
  return <View style={[base, props.active ? { backgroundColor: c } : { borderWidth: 1.5, borderColor: c }]} />;
}

function Shell(props) {
  var state = props.state, setState = props.setState;
  var activeTab = state.tab === "detail" ? (state.from || "market") : state.tab;

  var body = null;
  if (state.tab === "market") body = <MarketScreen {...props} />;
  else if (state.tab === "detail") body = <DetailScreen {...props} />;
  else if (state.tab === "watch") body = <WatchlistScreen {...props} />;
  else if (state.tab === "news") body = <NewsScreen {...props} />;
  else if (state.tab === "lexicon") body = <LexiconScreen {...props} />;
  else if (state.tab === "settings") body = <SettingsScreen {...props} />;
  else if (state.tab === "trust") body = <TrustScreen {...props} />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bgTop }}>
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 6 }}>{body}</View>
      </SafeAreaView>
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "rgba(12,16,22,0.96)" }}>
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", paddingTop: 12, paddingBottom: 10 }}>
          {TABS.map(function (t) {
            var on = t.id === activeTab;
            var col = on ? C.ringUp : "rgba(232,234,236,0.45)";
            return (
              <Pressable key={t.id} onPress={function () { setState({ tab: t.id, detail: t.id === "market" ? null : state.detail }); }}
                style={{ flex: 1, alignItems: "center", gap: 6 }}>
                <View style={{ height: 14, justifyContent: "center" }}>
                  <TabIcon shape={t.shape} color={col} active={on} />
                </View>
                <Text style={[T.mono(8.5), { color: on ? C.up : "rgba(232,234,236,0.45)", letterSpacing: 0.2 }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function QuantumApp() {
  var [state, setStateRaw] = useState({
    tab: "market",
    index: "cac",
    horizon: "1S",
    sims: 10000,
    detail: null,
    detailTab: "est",
    techCat: "Tous",
    sortByScore: true,
    watch: [],
    from: "market",
  });

  // memorisation de la liste suivie et des reglages entre deux ouvertures
  var PREFS = "qa.prefs.v1";
  var loaded = useRef(false);
  useEffect(function () {
    AsyncStorage.getItem(PREFS).then(function (raw) {
      if (raw) {
        try {
          var p = JSON.parse(raw);
          setStateRaw(function (prev) {
            return Object.assign({}, prev, {
              watch: Array.isArray(p.watch) ? p.watch : prev.watch,
              horizon: p.horizon || prev.horizon,
              sims: p.sims || prev.sims,
              index: p.index || prev.index,
            });
          });
        } catch (e) {}
      }
    }).catch(function () {}).finally(function () { loaded.current = true; });
  }, []);
  useEffect(function () {
    if (!loaded.current) return;
    AsyncStorage.setItem(PREFS, JSON.stringify({ watch: state.watch, horizon: state.horizon, sims: state.sims, index: state.index })).catch(function () {});
  }, [state.watch, state.horizon, state.sims, state.index]);

  var setState = useCallback(function (patch) {
    setStateRaw(function (prev) { return Object.assign({}, prev, patch); });
  }, []);

  var open = useCallback(function (id) {
    setStateRaw(function (prev) {
      return Object.assign({}, prev, { detail: id, tab: "detail", detailTab: "est", from: prev.tab === "detail" ? prev.from : prev.tab });
    });
  }, []);

  var back = useCallback(function () {
    setStateRaw(function (prev) { return Object.assign({}, prev, { tab: prev.from || "market", detail: null }); });
  }, []);

  var toggleWatch = useCallback(function (id) {
    setStateRaw(function (prev) {
      var has = prev.watch.indexOf(id) >= 0;
      return Object.assign({}, prev, {
        watch: has ? prev.watch.filter(function (x) { return x !== id; }) : prev.watch.concat([id]),
      });
    });
  }, []);

  var shared = { state: state, setState: setState, open: open, back: back, toggleWatch: toggleWatch };

  return (
    <BrainProvider>
      <MarketDataProvider horizon={state.horizon} sims={state.sims}>
        <Shell {...shared} />
      </MarketDataProvider>
    </BrainProvider>
  );
}
