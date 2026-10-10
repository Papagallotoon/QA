// Transforme des chandeliers bruts en objet "valeur" pret a afficher.
// Le calcul des ~95 indicateurs est mis en cache par serie de chandeliers :
// changer d'horizon ou trier la liste ne recalcule plus tout.

import * as ta from "../core/ta.js";
import { computeAll, rowsAt } from "../core/signals.js";
import { evaluate, votes, verdictOf, familyContrib, sigmaAt, DEFAULT_MODEL, HORIZONS } from "../core/model.js";
import { simulate } from "../core/montecarlo.js";
import { evaluateAll, buildPlan } from "../core/plan.js";
import { PROFILES } from "../universe";

function money(v, cur) {
  if (v == null || isNaN(v)) return "-";
  return v.toFixed(2).replace(".", ",") + (cur ? " " + cur : "");
}
function pct(v) {
  if (v == null || isNaN(v)) return "-";
  return (v >= 0 ? "+" : "") + v.toFixed(2).replace(".", ",") + " %";
}

var indCache = new WeakMap();   // candles -> { idx, all }
var mcCache = new Map();        // cle -> resultat Monte-Carlo

function indicatorsFor(candles, indexCandles) {
  var hit = indCache.get(candles);
  if (hit && hit.idx === indexCandles) return hit.all;
  var idxClose = indexCandles && indexCandles !== candles ? ta.alignTo(candles.time, indexCandles) : null;
  var all = computeAll(candles, idxClose);
  indCache.set(candles, { idx: indexCandles, all: all });
  return all;
}

export function buildAsset(candles, indexCandles, horizon, sims, model) {
  if (!candles || candles.error || !candles.close || candles.close.length < 60) {
    return {
      id: candles ? candles.symbol : "?",
      error: candles && candles.error
        ? candles.error
        : "historique insuffisant pour calculer les indicateurs (60 seances minimum)",
    };
  }
  var M = model || DEFAULT_MODEL;
  var C = candles.close, i = C.length - 1;
  var price = candles.price != null ? candles.price : C[i];
  var prev = candles.previousClose != null ? candles.previousClose : C[i - 1];
  var cur = candles.currency === "EUR" ? "EUR" : candles.currency === "USD" ? "USD" : candles.currency || "";

  var all = indicatorsFor(candles, indexCandles);
  var sigma = sigmaAt(C, i, 60);
  var ev = evaluate(all, i, horizon, M, sigma);
  var v = votes(all, i);
  var hm = (M.horizons && M.horizons[horizon]) || DEFAULT_MODEL.horizons[horizon];

  var days = HORIZONS[horizon] || 5;
  var key = candles.symbol + "|" + C.length + "|" + C[i] + "|" + horizon + "|" + sims + "|" + (M.version || "");
  var mc = mcCache.get(key);
  if (!mc) {
    mc = simulate(price, sigma, ev.muLog, days, sims || 10000);
    mcCache.set(key, mc);
    if (mcCache.size > 400) mcCache.delete(mcCache.keys().next().value);
  }

  var up = ev.pUp >= 0.5;
  var score = Math.round((up ? ev.pUp : 1 - ev.pUp) * 100);
  var profile = PROFILES[candles.symbol] || { sector: "-", text: "Profil non renseigne pour cette valeur." };
  var bc = indexCandles && indexCandles !== candles && indexCandles.close ? ta.betaCorr(C, indexCandles.close) : { beta: NaN, corr: NaN };
  var hv = ta.histVol(C, 30);
  var oos = hm && hm.oos;

  return {
    id: candles.symbol,
    symbol: candles.symbol,
    name: candles.name,
    ticker: candles.symbol + " / " + (candles.exchange || ""),
    currency: cur,
    price: money(price, cur),
    priceRaw: price,
    change: pct(prev ? ((price - prev) / prev) * 100 : 0),
    changeRaw: prev ? ((price - prev) / prev) * 100 : 0,
    score: score,
    pUp: ev.pUp,
    expPct: ev.expPct,
    dir: up ? 1 : -1,
    sub: money(price, cur) + " / " + profile.sector,
    median: pct(mc.medianPct),
    interval: pct(mc.p05Pct) + " / " + pct(mc.p95Pct),
    expected: pct(ev.expPct),
    // fiabilite : taux de bonnes directions mesure hors echantillon par le serveur
    conf: oos && oos.accConf != null ? Math.round(oos.accConf * 100) + " %" : oos ? Math.round(oos.acc * 100) + " %" : "non mesuree",
    vol: isNaN(hv) ? "-" : hv.toFixed(1).replace(".", ",") + " %",
    beta: isNaN(bc.beta) ? "-" : bc.beta.toFixed(2).replace(".", ","),
    corr: isNaN(bc.corr) ? "-" : bc.corr.toFixed(2).replace(".", ","),
    sectorLabel: "SECTEUR / " + profile.sector.toUpperCase(),
    sector: profile.text,
    factors: familyContrib(all, i, hm),
    tech: rowsAt(all, i, cur),
    cons: Object.assign({}, v, { verdict: verdictOf(ev.pUp) }),
    mc: mc,
    history: C.slice(-60),
    // pour le plan de position (calcule a la demande dans l'ecran detail)
    _candles: candles, _all: all, _sigma: sigma, _model: M,
  };
}

var planCache = new Map();
export function planFor(asset, forceH) {
  if (!asset || asset.error || !asset._candles) return null;
  var c = asset._candles;
  var key = asset.symbol + "|" + c.close.length + "|" + c.close[c.close.length - 1] + "|" + (asset._model.version || "") + "|" + (forceH || "auto");
  var hit = planCache.get(key);
  if (hit) return hit;
  var evals = evaluateAll(asset._all, c.close.length - 1, asset._model, asset._sigma);
  var plan = buildPlan(c, evals, asset._sigma, forceH);
  plan.evals = evals;
  planCache.set(key, plan);
  if (planCache.size > 200) planCache.delete(planCache.keys().next().value);
  return plan;
}

export function buildIndex(def, candles, horizon, sims, model) {
  var asset = buildAsset(candles, candles, horizon, sims, model);
  if (asset.error) return { id: def.id, name: def.name, label: def.label, error: asset.error };
  return Object.assign({}, asset, {
    id: def.id,
    name: def.name,
    label: def.label,
    place: def.place,
    marketState: candles.marketState,
  });
}
