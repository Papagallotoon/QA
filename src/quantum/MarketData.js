import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { fetchCandles, fetchMany } from "./api/yahoo";
import { referenceIndex } from "./api/search";
import { INDEX_DEFS, COMPONENTS } from "./universe";
import { buildAsset, buildIndex } from "./model/build";
import { useBrain } from "./Brain";

var Ctx = createContext(null);
var CACHE_MS = 5 * 60 * 1000;

export function MarketDataProvider(props) {
  var [store, setStore] = useState({});      // indexId -> { index, assets, at }
  var [loading, setLoading] = useState({});  // indexId -> bool
  var [errors, setErrors] = useState({});    // indexId -> string
  var raw = useRef({});                      // indexId -> { index, comps, at }
  var extra = useRef({});                    // symbole cherche -> { candles, index, at }
  var [tick, setTick] = useState(0);         // force le recalcul apres un chargement

  var horizon = props.horizon;
  var sims = props.sims;
  var brain = useBrain();
  var model = brain.model;

  var load = useCallback(async function (indexId, force) {
    var def = INDEX_DEFS.filter(function (d) { return d.id === indexId; })[0];
    if (!def) return;
    var cached = raw.current[indexId];
    if (!force && cached && Date.now() - cached.at < CACHE_MS) return;

    setLoading(function (p) { var n = Object.assign({}, p); n[indexId] = true; return n; });
    setErrors(function (p) { var n = Object.assign({}, p); delete n[indexId]; return n; });

    try {
      var symbols = COMPONENTS[indexId] || [];
      var idxCandles = await fetchCandles(def.symbol, "2y", "1d");
      var compCandles = await fetchMany(symbols, "2y", "1d", 4);
      raw.current[indexId] = { at: Date.now(), index: idxCandles, comps: compCandles };
      setStore(function (p) {
        var n = Object.assign({}, p);
        n[indexId] = { at: Date.now() };
        return n;
      });
    } catch (e) {
      setErrors(function (p) {
        var n = Object.assign({}, p);
        n[indexId] = e.message || String(e);
        return n;
      });
    } finally {
      setLoading(function (p) { var n = Object.assign({}, p); n[indexId] = false; return n; });
    }
  }, []);

  var loadSymbol = useCallback(async function (symbol) {
    var hit = extra.current[symbol];
    if (hit && Date.now() - hit.at < CACHE_MS) return true;
    setLoading(function (p) { var n = Object.assign({}, p); n[symbol] = true; return n; });
    try {
      var refSym = referenceIndex(symbol);
      var pair = await Promise.all([
        fetchCandles(symbol, "2y", "1d"),
        fetchCandles(refSym, "2y", "1d").catch(function () { return null; }),
      ]);
      extra.current[symbol] = { at: Date.now(), candles: pair[0], index: pair[1] };
      setTick(function (t) { return t + 1; });
      return true;
    } catch (e) {
      setErrors(function (p) { var n = Object.assign({}, p); n[symbol] = e.message || String(e); return n; });
      setTick(function (t) { return t + 1; });
      return false;
    } finally {
      setLoading(function (p) { var n = Object.assign({}, p); n[symbol] = false; return n; });
    }
  }, []);

  // Les objets calcules dependent de l'horizon et du nombre de scenarios :
  // on les reconstruit a la demande, sans refaire d'appel reseau.
  var getIndex = useCallback(function (indexId) {
    var r = raw.current[indexId];
    if (!r) return null;
    var def = INDEX_DEFS.filter(function (d) { return d.id === indexId; })[0];
    return buildIndex(def, r.index, horizon, sims, model);
  }, [horizon, sims, store, tick, model]);

  var getAssets = useCallback(function (indexId) {
    var r = raw.current[indexId];
    if (!r) return [];
    var syms = COMPONENTS[indexId] || [];
    return syms.map(function (s) { return buildAsset(r.comps[s], r.index, horizon, sims, model); })
      .filter(function (a) { return !a.error; });
  }, [horizon, sims, store, tick, model]);

  var getAsset = useCallback(function (symbol) {
    var keys = Object.keys(raw.current);
    for (var i = 0; i < keys.length; i++) {
      var r = raw.current[keys[i]];
      if (r.comps && r.comps[symbol] && !r.comps[symbol].error) return buildAsset(r.comps[symbol], r.index, horizon, sims, model);
    }
    var x = extra.current[symbol];
    if (x) return buildAsset(x.candles, x.index, horizon, sims, model);
    return null;
  }, [horizon, sims, store, tick, model]);

  var value = {
    load: load,
    loadSymbol: loadSymbol,
    getIndex: getIndex,
    getAssets: getAssets,
    getAsset: getAsset,
    loading: loading,
    errors: errors,
    lastUpdate: store,
  };

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function useMarketData() {
  var c = useContext(Ctx);
  if (!c) throw new Error("useMarketData doit etre utilise dans un MarketDataProvider");
  return c;
}

export function useIndexData(indexId) {
  var md = useMarketData();
  useEffect(function () { md.load(indexId); }, [indexId]);
  return {
    index: md.getIndex(indexId),
    assets: md.getAssets(indexId),
    loading: !!md.loading[indexId],
    error: md.errors[indexId],
    refresh: function () { md.load(indexId, true); },
  };
}
