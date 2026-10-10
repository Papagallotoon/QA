// Plan de position : sur quel horizon se positionner, quand entrer,
// ou placer le stop et l'objectif, combien de temps garder.
// Purement statistique et technique - ce n'est pas un conseil personnalise.

import * as ta from "./ta.js";
import { HORIZONS, HORIZON_KEYS, HORIZON_LABEL, evaluate } from "./model.js";
import { simulate } from "./montecarlo.js";

var COSTS_PCT = 0.3;           // frais + spread aller-retour estimes
var STOP_ATR = { "1J": 1, "1S": 1.5, "1M": 2.2, "3M": 3 };
var MIN_P = 0.53, MAX_P_AVOID = 0.47;

function ok(v) { return v === v && v != null && isFinite(v); }
function f2(v) { return ok(v) ? v.toFixed(2).replace(".", ",") : "-"; }

export function addBusinessDays(ts, n) {
  var d = new Date(ts * 1000), added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    var w = d.getUTCDay();
    if (w !== 0 && w !== 6) added++;
  }
  return d;
}
export function frDate(d) {
  var j = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."][d.getUTCDay()];
  return j + " " + String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

// Fiabilite mesuree du modele sur un horizon (correlation hors echantillon)
function reliability(ev) {
  var ic = ev.oos && ok(ev.oos.ic) ? ev.oos.ic : 0.02;
  return Math.max(0.005, ic);
}

/**
 * Choisit l'horizon ou l'avantage statistique est le plus net,
 * pondere par la fiabilite mesuree du modele sur cet horizon.
 */
export function bestHorizon(evals) {
  var best = null;
  HORIZON_KEYS.forEach(function (h) {
    var ev = evals[h];
    if (!ev) return;
    var edge = Math.abs(ev.pUp - 0.5) * reliability(ev) * (Math.abs(ev.expPct) > COSTS_PCT ? 1 : 0.3);
    if (!best || edge > best.edge) best = { h: h, edge: edge };
  });
  return best ? best.h : "1S";
}

export function evaluateAll(all, i, model, sigma) {
  var out = {};
  HORIZON_KEYS.forEach(function (h) { out[h] = evaluate(all, i, h, model, sigma); });
  return out;
}

/**
 * @param c      chandeliers { open, high, low, close, time }
 * @param evals  resultat de evaluateAll
 * @param sigma  volatilite quotidienne
 * @param forceH horizon impose (sinon choisi automatiquement)
 */
export function buildPlan(c, evals, sigma, forceH) {
  var C = c.close, H = c.high, L = c.low, n = C.length, i = n - 1;
  var price = C[i];
  var h = forceH || bestHorizon(evals);
  var ev = evals[h];
  var days = HORIZONS[h];
  var atr = ta.last(ta.atr(H, L, C, 14));
  var ema20 = ta.last(ta.ema(C, 20));
  var sma50s = ta.sma(C, 50), sma50 = sma50s[i];
  var sma50slope = ok(sma50s[i - 10]) ? sma50 - sma50s[i - 10] : 0;
  var rsi = ta.last(ta.rsi(C, 14));
  var hi10 = Math.max.apply(null, H.slice(Math.max(0, n - 11), n - 1));
  var lastTs = c.time && c.time.length ? c.time[i] : Math.floor(Date.now() / 1000);
  var why = [];

  var base = {
    horizon: h, horizonLabel: HORIZON_LABEL[h], days: days,
    pUp: ev.pUp, expPct: ev.expPct, atr: atr, price: price,
    reliability: ev.oos ? ev.oos : null,
  };

  if (!ok(atr) || !ok(ema20)) {
    return Object.assign(base, { action: "NEUTRE", actionLabel: "Donnees insuffisantes", why: ["Historique trop court pour construire un plan."] });
  }

  if (ev.pUp <= MAX_P_AVOID) {
    var protect = price - STOP_ATR[h] * atr;
    why.push("Probabilite de hausse de " + Math.round(ev.pUp * 100) + " % sur " + HORIZON_LABEL[h] + " : le modele penche a la baisse.");
    if (price < sma50) why.push("Le cours est sous sa moyenne 50 jours.");
    return Object.assign(base, {
      action: "EVITER", actionLabel: "Eviter / alleger",
      start: "Pas d'achat pour l'instant",
      stop: protect,
      reviewDate: addBusinessDays(lastTs, Math.min(days, 5)),
      why: why.concat(["Si tu detiens deja la valeur : protection possible sous " + f2(protect) + "."]),
    });
  }

  if (ev.pUp < MIN_P || ev.expPct < COSTS_PCT) {
    why.push("Avantage statistique trop faible (" + Math.round(ev.pUp * 100) + " % de hausse, " + f2(ev.expPct) + " % attendu) pour couvrir les frais.");
    return Object.assign(base, {
      action: "NEUTRE", actionLabel: "Rester a l'ecart",
      start: "Attendre un meilleur signal",
      reviewDate: addBusinessDays(lastTs, 5),
      why: why,
    });
  }

  var action, zoneLo, zoneHi, entry, start, validity;
  var stretch = (price - ema20) / atr;
  if (price < sma50 && sma50slope < 0) {
    action = "ATTENDRE_CONFIRMATION";
    entry = Math.max(hi10, ema20);
    zoneLo = entry; zoneHi = entry + 0.3 * atr;
    validity = Math.max(5, Math.min(15, days));
    start = "Acheter seulement apres une cloture au-dessus de " + f2(entry);
    why.push("Les indicateurs sont positifs mais la tendance de fond (SMA 50) baisse encore : on attend la confirmation.");
  } else if (stretch > 1.5 || rsi > 70) {
    action = "ATTENDRE_REPLI";
    zoneHi = Math.min(price, ema20 + 0.5 * atr);
    zoneLo = ema20 - 0.25 * atr;
    entry = (zoneLo + zoneHi) / 2;
    validity = Math.max(3, Math.min(10, days));
    start = "Ordre limite entre " + f2(zoneLo) + " et " + f2(zoneHi);
    why.push("Le cours est etire (" + stretch.toFixed(1).replace(".", ",") + " ATR au-dessus de l'EMA 20" + (rsi > 70 ? ", RSI " + Math.round(rsi) : "") + ") : mieux vaut attendre un repli.");
  } else {
    action = "ENTRER";
    zoneLo = price - 0.5 * atr; zoneHi = price + 0.2 * atr;
    entry = price;
    validity = 2;
    start = "Des la prochaine seance";
    why.push("Signal positif, tendance compatible et cours non etire : conditions d'entree reunies.");
  }

  var stop = entry - STOP_ATR[h] * atr;
  var risk = entry - stop;
  var mc0 = simulate(entry, sigma, ev.muLog, days, 4000);
  var target = Math.max(mc0.p80, entry + 1.5 * risk);
  var mc = simulate(entry, sigma, ev.muLog, days, 4000, { stop: stop, target: target });
  var gainPct = ((target - entry) / entry) * 100, riskPct = (risk / entry) * 100;
  var expectancy = mc.pTarget * gainPct - mc.pStop * riskPct + mc.pNone * ev.expPct - COSTS_PCT;
  why.push("Probabilite de hausse " + Math.round(ev.pUp * 100) + " % sur " + HORIZON_LABEL[h] + ", rendement median attendu " + (ev.expPct >= 0 ? "+" : "") + f2(ev.expPct) + " %.");
  if (expectancy <= 0) why.push("Attention : esperance apres frais negative ou nulle sur la simulation - position facultative.");

  return Object.assign(base, {
    action: action,
    actionLabel: action === "ENTRER" ? "Entrer" : action === "ATTENDRE_REPLI" ? "Attendre un repli" : "Attendre la confirmation",
    start: start,
    zoneLo: zoneLo, zoneHi: zoneHi, entry: entry,
    validity: validity, validUntil: addBusinessDays(lastTs, validity),
    stop: stop, target: target,
    riskPct: riskPct, gainPct: gainPct, rr: (target - entry) / risk,
    pTarget: mc.pTarget, pStop: mc.pStop, expectancy: expectancy,
    // taille de position pour ne risquer que 1 % du capital si le stop est touche
    sizePct: Math.min(100, (1 / riskPct) * 100),
    holdDays: days,
    reviewDate: addBusinessDays(lastTs, days + (action === "ENTRER" ? 0 : Math.min(validity, 5))),
    why: why,
  });
}
