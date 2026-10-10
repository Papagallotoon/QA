// Modele de decision : combine les signaux en un score, puis en probabilite
// de hausse et en rendement attendu pour chaque horizon.
// Les poids et la calibration sont appris chaque jour par le serveur
// (server/daily.mjs) et publies dans model.json ; l'app les telecharge.
// Tant qu'aucun modele appris n'est disponible, on utilise DEFAULT_MODEL :
// vote a poids egaux, calibration volontairement prudente.

export const HORIZONS = { "1J": 1, "1S": 5, "1M": 21, "3M": 63 };
export const HORIZON_LABEL = { "1J": "1 jour", "1S": "1 semaine", "1M": "1 mois", "3M": "3 mois" };
export const HORIZON_KEYS = ["1J", "1S", "1M", "3M"];

function ok(v) { return v === v && v != null && isFinite(v); }
export function logistic(x) { return 1 / (1 + Math.exp(-x)); }

export const DEFAULT_MODEL = {
  version: "defaut",
  source: "default",
  createdAt: null,
  horizons: {
    "1J": { weights: null, intercept: 0, calib: { a: 0, b: 0.25 }, k: 0.10, oos: null },
    "1S": { weights: null, intercept: 0, calib: { a: 0, b: 0.30 }, k: 0.12, oos: null },
    "1M": { weights: null, intercept: 0, calib: { a: 0, b: 0.32 }, k: 0.15, oos: null },
    "3M": { weights: null, intercept: 0, calib: { a: 0, b: 0.32 }, k: 0.15, oos: null },
  },
};

// Score brut = somme ponderee des signaux a la date i.
// Sans poids appris : moyenne des signaux directionnels (entre -1 et +1).
export function rawScore(all, i, hm) {
  var w = hm && hm.weights, s = 0, cnt = 0;
  for (var k = 0; k < all.length; k++) {
    var ind = all[k];
    if (!ind.sig) continue;
    var v = ind.sig[i];
    if (!ok(v)) v = 0;
    if (w) { var wi = w[ind.id]; if (ok(wi)) s += wi * v; }
    else { s += v; cnt++; }
  }
  if (w) return s + (hm.intercept || 0);
  return cnt ? s / cnt : 0;
}

/**
 * Evaluation d'un titre a la date i pour un horizon donne.
 * sigmaDaily : volatilite quotidienne (log) recente.
 * Renvoie la probabilite de hausse calibree et le rendement attendu (log).
 */
export function evaluate(all, i, horizonKey, model, sigmaDaily) {
  var m = model || DEFAULT_MODEL;
  var hm = (m.horizons && m.horizons[horizonKey]) || DEFAULT_MODEL.horizons[horizonKey];
  var days = HORIZONS[horizonKey] || 5;
  var s = rawScore(all, i, hm);
  var cal = hm.calib || { a: 0, b: 0.3 };
  var p = logistic(cal.a + cal.b * s);
  // borne de securite : un modele statistique sur actions ne doit jamais
  // afficher de certitude
  p = Math.max(0.2, Math.min(0.8, p));
  var z = (hm.k || 0) * s; // rendement attendu en ecarts-types de l'horizon
  z = Math.max(-1, Math.min(1, z));
  var muLog = ok(sigmaDaily) ? z * sigmaDaily * Math.sqrt(days) : 0;
  return { score: s, pUp: p, z: z, muLog: muLog, expPct: (Math.exp(muLog) - 1) * 100, days: days, oos: hm.oos || null };
}

export function verdictOf(pUp) {
  return pUp >= 0.6 ? "ACHAT FORT" : pUp >= 0.54 ? "ACHAT" : pUp <= 0.4 ? "VENTE FORTE" : pUp <= 0.46 ? "VENTE" : "NEUTRE";
}

// Vote simple des indicateurs (affichage du nombre achat / neutre / vente)
export function votes(all, i) {
  var buy = 0, sell = 0, neu = 0, info = 0;
  for (var k = 0; k < all.length; k++) {
    var ind = all[k];
    if (!ind.sig) { info++; continue; }
    var v = ind.sig[i];
    if (!ok(v)) { info++; continue; }
    if (v > 0) buy++; else if (v < 0) sell++; else neu++;
  }
  var dir = buy + sell + neu;
  return { buy: buy, sell: sell, neu: neu, directional: dir, info: info, net: dir ? (buy - sell) / dir : 0 };
}

// Poids moyen par famille d'indicateurs dans le score (pour "detail du calcul")
export function familyContrib(all, i, hm) {
  var fams = ["Tendance", "Momentum", "Volatilite", "Volume", "Structure", "Chandeliers"];
  var w = hm && hm.weights;
  var acc = {}, tot = 0;
  fams.forEach(function (f) { acc[f] = 0; });
  for (var k = 0; k < all.length; k++) {
    var ind = all[k];
    if (!ind.sig) continue;
    var v = ind.sig[i];
    if (!ok(v)) continue;
    var wi = w ? (ok(w[ind.id]) ? w[ind.id] : 0) : 1;
    acc[ind.cat] += wi * v;
    tot += Math.abs(wi);
  }
  return fams.filter(function (f) { return acc[f] !== 0 || !w; })
    .map(function (f) { return [f, tot ? Math.round((acc[f] / tot) * 100 * 3) : 0]; })
    .map(function (x) { return [x[0], Math.max(-100, Math.min(100, x[1]))]; });
}

export function sigmaAt(close, i, n) {
  var len = n || 60, start = Math.max(1, i - len + 1), s = 0, s2 = 0, cnt = 0;
  for (var k = start; k <= i; k++) {
    var r = Math.log(close[k] / close[k - 1]);
    if (!ok(r)) continue;
    s += r; s2 += r * r; cnt++;
  }
  if (cnt < 10) return NaN;
  var m = s / cnt;
  return Math.sqrt(Math.max(0, (s2 - cnt * m * m) / (cnt - 1)));
}
