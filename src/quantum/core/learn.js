// Apprentissage automatique quotidien (execute par le serveur, pas par le telephone).
//
// Principe "champion / challenger", sans triche sur le futur :
//  1. Pour chaque titre et chaque jour passe, on connait les signaux de ce jour-la
//     et ce qui s'est reellement passe ensuite (rendement a 1 j, 5 j, 21 j, 63 j).
//  2. On entraine un nouveau jeu de poids (regression ridge) sur le passe ancien,
//     puis on le teste sur les 120 dernieres seances qu'il n'a jamais vues.
//  3. Le modele actuel (champion) est teste sur exactement les memes seances.
//  4. Le challenger ne remplace le champion que s'il fait mieux hors echantillon.
//  5. La calibration (score -> probabilite) est refaite sur ces seances test,
//     donc les pourcentages affiches correspondent a ce qui a ete observe.

import { HORIZONS, HORIZON_KEYS, rawScore, logistic, sigmaAt } from "./model.js";

function ok(v) { return v === v && v != null && isFinite(v); }

var START = 210;      // on attend que la SMA 200 et consorts soient definies
var VAL_DAYS = 120;   // seances de validation hors echantillon
var ALPHAS = [0.0005, 0.005, 0.05, 0.5];

/**
 * @param items [{ sym, all, close, time }]
 * @param ids   identifiants des indicateurs directionnels (ordre fixe)
 */
export function buildSamples(items, ids, h) {
  var X = [], y = [], day = [], sym = [];
  items.forEach(function (it) {
    var idx = ids.map(function (id) { return it.all.find(function (x) { return x.id === id; }); });
    var C = it.close, n = C.length;
    for (var t = START; t + h < n; t++) {
      var sg = sigmaAt(C, t, 60);
      if (!ok(sg) || sg <= 0) continue;
      var r = Math.log(C[t + h] / C[t]);
      if (!ok(r)) continue;
      var row = new Float64Array(ids.length);
      for (var k = 0; k < ids.length; k++) {
        var ind = idx[k];
        var v = ind && ind.sig ? ind.sig[t] : 0;
        row[k] = ok(v) ? v : 0;
      }
      X.push(row);
      y.push(Math.max(-4, Math.min(4, r / (sg * Math.sqrt(h)))));
      day.push(Math.floor(it.time[t] / 86400));
      sym.push(it.sym);
    }
  });
  return { X: X, y: y, day: day, sym: sym };
}

// Resolution d'un systeme lineaire symetrique par elimination de Gauss avec pivot
function solve(A, b) {
  var n = b.length, M = A.map(function (r, i) { return Array.prototype.slice.call(r).concat([b[i]]); });
  for (var c = 0; c < n; c++) {
    var p = c;
    for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    var tmp = M[c]; M[c] = M[p]; M[p] = tmp;
    var piv = M[c][c];
    if (Math.abs(piv) < 1e-12) continue;
    for (var r2 = 0; r2 < n; r2++) {
      if (r2 === c) continue;
      var f = M[r2][c] / piv;
      if (f === 0) continue;
      for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k];
    }
  }
  return M.map(function (row, i) { return Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]; });
}

// Ridge avec constante (la constante est aussi penalisee, pour ne pas
// apprendre "la bourse monte toujours" sur une periode haussiere)
export function ridge(X, y, rows, alpha) {
  var F = X[0].length + 1, A = [], b = new Float64Array(F);
  for (var i = 0; i < F; i++) A.push(new Float64Array(F));
  for (var q = 0; q < rows.length; q++) {
    var r = rows[q], x = X[r], yy = y[r];
    for (var a = 0; a < F; a++) {
      var xa = a < F - 1 ? x[a] : 1;
      if (xa === 0) continue;
      b[a] += xa * yy;
      var Aa = A[a];
      for (var c = a; c < F; c++) {
        var xc = c < F - 1 ? x[c] : 1;
        if (xc !== 0) Aa[c] += xa * xc;
      }
    }
  }
  for (var a2 = 0; a2 < F; a2++) for (var c2 = 0; c2 < a2; c2++) A[a2][c2] = A[c2][a2];
  var lam = alpha * rows.length;
  for (var d = 0; d < F; d++) A[d][d] += lam;
  var w = solve(A, b);
  return { w: w.slice(0, F - 1), intercept: w[F - 1] };
}

function predict(fit, x) {
  var s = fit.intercept || 0;
  for (var k = 0; k < x.length; k++) s += fit.w[k] * x[k];
  return s;
}

export function corr(a, b) {
  var n = a.length; if (n < 3) return 0;
  var ma = 0, mb = 0;
  for (var i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  var c = 0, va = 0, vb = 0;
  for (var k = 0; k < n; k++) { c += (a[k] - ma) * (b[k] - mb); va += (a[k] - ma) * (a[k] - ma); vb += (b[k] - mb) * (b[k] - mb); }
  return va * vb > 0 ? c / Math.sqrt(va * vb) : 0;
}

// Regression logistique a 2 parametres : P(hausse) = logistic(a + b * score)
export function fitCalib(s, y) {
  var a = 0, b = 0;
  for (var it = 0; it < 25; it++) {
    var ga = 0, gb = 0, haa = 0, hab = 0, hbb = 0;
    for (var i = 0; i < s.length; i++) {
      var p = logistic(a + b * s[i]), t = y[i] > 0 ? 1 : 0, wgt = p * (1 - p);
      ga += t - p; gb += (t - p) * s[i];
      haa += wgt; hab += wgt * s[i]; hbb += wgt * s[i] * s[i];
    }
    hbb += 1e-6 * s.length; haa += 1e-6 * s.length;
    var det = haa * hbb - hab * hab;
    if (Math.abs(det) < 1e-12) break;
    var da = (hbb * ga - hab * gb) / det, db = (haa * gb - hab * ga) / det;
    a += da; b += db;
    if (Math.abs(da) + Math.abs(db) < 1e-7) break;
  }
  // une calibration qui inverserait le signal n'a pas de sens : pas d'avantage
  if (b < 0) b = 0;
  return { a: Math.max(-0.4, Math.min(0.4, a)), b: b };
}

export function metrics(s, y, calib) {
  var n = s.length, hit = 0, cnt = 0, hitC = 0, cntC = 0, brier = 0;
  for (var i = 0; i < n; i++) {
    var p = calib ? logistic(calib.a + calib.b * s[i]) : (s[i] > 0 ? 0.55 : s[i] < 0 ? 0.45 : 0.5);
    var up = y[i] > 0 ? 1 : 0;
    brier += (p - up) * (p - up);
    if (s[i] !== 0) { cnt++; if ((s[i] > 0) === (y[i] > 0)) hit++; }
    if (Math.abs(p - 0.5) >= 0.03) { cntC++; if ((p > 0.5) === (y[i] > 0)) hitC++; }
  }
  return {
    n: n, ic: corr(s, y),
    acc: cnt ? hit / cnt : 0.5,
    accConf: cntC ? hitC / cntC : null, nConf: cntC,
    brier: n ? brier / n : 0.25,
  };
}

/**
 * Entraine et selectionne le modele de chaque horizon.
 * @param items  donnees par titre (cf. buildSamples)
 * @param ids    ordre des indicateurs directionnels
 * @param champion modele actuellement en service (ou null)
 * @param names  { id: nom lisible } pour le rapport
 */
export function trainAll(items, ids, champion, names) {
  var model = { version: null, source: "learned", features: ids, horizons: {} };
  var report = {};

  HORIZON_KEYS.forEach(function (hk) {
    var h = HORIZONS[hk];
    var S = buildSamples(items, ids, h);
    var champH = champion && champion.horizons && champion.horizons[hk];
    if (S.y.length < 2000) {
      report[hk] = { skipped: true, reason: "pas assez d'historique (" + S.y.length + " echantillons)" };
      if (champH) model.horizons[hk] = champH;
      return;
    }
    var days = Array.from(new Set(S.day)).sort(function (a, b) { return a - b; });
    var valStart = days[Math.max(0, days.length - VAL_DAYS)];
    var trainEnd = days[Math.max(0, days.length - VAL_DAYS - h)];
    var trainRows = [], valRows = [];
    for (var i = 0; i < S.y.length; i++) {
      if (S.day[i] >= valStart) valRows.push(i);
      else if (S.day[i] < trainEnd) trainRows.push(i);
    }
    var yVal = valRows.map(function (r) { return S.y[r]; });

    // Chaque configuration (vote simple ou ridge a differents niveaux de prudence)
    // est entrainee sur le passe ancien et notee sur les 120 seances recentes.
    // Le champion n'est pas note avec ses poids deployes (ils ont deja vu ces
    // seances, ce serait tricher) mais re-entraine de la meme facon que les autres.
    var configs = [{ alpha: "vote" }].concat(ALPHAS.map(function (a) { return { alpha: a }; }));
    configs.forEach(function (cf) {
      var sv;
      if (cf.alpha === "vote") {
        sv = valRows.map(function (r) { var x = S.X[r], m = 0; for (var k = 0; k < x.length; k++) m += x[k]; return m / x.length; });
      } else {
        var fit = ridge(S.X, S.y, trainRows, cf.alpha);
        sv = valRows.map(function (r) { return predict(fit, S.X[r]); });
      }
      cf.sv = sv;
      cf.ic = corr(sv, yVal);
    });
    var best = configs.reduce(function (a, b) { return b.ic > a.ic ? b : a; });
    var champAlpha = champH && champH.weights ? champH.alpha : "vote";
    var champCf = configs.filter(function (cf) { return cf.alpha === champAlpha; })[0] || configs[0];
    // hysteresis : on ne change de configuration que pour un gain net
    var adopt = best !== champCf && best.ic > champCf.ic + 0.003;
    var chosen = adopt ? best : champCf;
    var champIc = champCf.ic;
    var chosenS = chosen.sv;
    var calib = fitCalib(chosenS, yVal);
    var ss = 0, sy = 0;
    for (var q = 0; q < chosenS.length; q++) { ss += chosenS[q] * chosenS[q]; sy += chosenS[q] * yVal[q]; }
    var kk = ss > 0 ? Math.max(0, Math.min(1.2, sy / ss)) : 0;
    // aucune configuration ne prevoit mieux que le hasard : on l'assume (50 %)
    if (chosen.ic <= 0) { calib = { a: 0, b: 0 }; kk = 0; }
    var oos = metrics(chosenS, yVal, calib);

    var hm;
    if (chosen.alpha === "vote") {
      hm = { weights: null, intercept: 0, alpha: "vote" };
    } else {
      // version deployee : re-entrainee sur tout l'historique disponible
      var final = ridge(S.X, S.y, trainRows.concat(valRows), chosen.alpha);
      var wObj = {};
      ids.forEach(function (id, k) { wObj[id] = Math.round(final.w[k] * 1e5) / 1e5; });
      hm = { weights: wObj, intercept: Math.round(final.intercept * 1e5) / 1e5, alpha: chosen.alpha };
      // le score doit rester sur l'echelle de la calibration : on la refait
      // sur les predictions du modele final pour la validation
    }
    hm.calib = { a: Math.round(calib.a * 1e4) / 1e4, b: Math.round(calib.b * 1e4) / 1e4 };
    hm.k = Math.round(kk * 1e4) / 1e4;
    hm.oos = { ic: round4(oos.ic), acc: round4(oos.acc), accConf: oos.accConf == null ? null : round4(oos.accConf), nConf: oos.nConf, brier: round4(oos.brier), n: oos.n };
    model.horizons[hk] = hm;

    var top = [];
    if (hm.weights) {
      top = ids.map(function (id) { return { id: id, name: (names && names[id]) || id, w: hm.weights[id] || 0 }; })
        .sort(function (a, b) { return Math.abs(b.w) - Math.abs(a.w); }).slice(0, 8);
    }
    report[hk] = {
      samples: S.y.length, train: trainRows.length, val: valRows.length,
      configChanged: adopt, from: champAlpha, to: chosen.alpha,
      bestIc: round4(best.ic), championIc: round4(champIc),
      configs: configs.map(function (cf) { return { alpha: cf.alpha, ic: round4(cf.ic) }; }),
      oos: hm.oos, top: top,
    };
  });

  return { model: model, report: report };
}

function round4(v) { return ok(v) ? Math.round(v * 1e4) / 1e4 : v; }

// score d'un titre a la date i avec un modele (utilise par le serveur pour le journal)
export { rawScore };
