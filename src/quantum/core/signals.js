// Catalogue des indicateurs. Chaque indicateur fournit :
//  - value : serie de valeurs (affichee dans l'onglet TECHNIQUE)
//  - sig   : serie de signaux -1 / 0 / +1 (null = indicateur purement informatif)
// Les signaux "bruts" suivent la lecture classique de chaque indicateur ;
// c'est le modele appris (model.js) qui decide ensuite combien chacun compte,
// et meme s'il faut l'inverser quand l'historique montre qu'il se trompe.

import * as ta from "./ta.js";

export const CATS = ["Tous", "Tendance", "Momentum", "Volatilite", "Volume", "Structure", "Chandeliers"];

function ok(v) { return v === v && v != null && isFinite(v); }
function nanArr(n) { var o = new Array(n); for (var i = 0; i < n; i++) o[i] = NaN; return o; }

// prix au-dessus de la ligne = +1, en dessous = -1 (bande morte en %)
function vsPrice(line, close, band) {
  var b = band == null ? 0.003 : band;
  return close.map(function (p, i) { var v = line[i]; if (!ok(v)) return NaN; var d = (p - v) / v; return d > b ? 1 : d < -b ? -1 : 0; });
}
function sign(series, band) {
  var b = band || 0;
  return series.map(function (v) { return !ok(v) ? NaN : v > b ? 1 : v < -b ? -1 : 0; });
}
function diff(a, b, band) { return sign(a.map(function (v, i) { return v - b[i]; }), band); }
// lecture "retour a la moyenne" : trop haut = -1, trop bas = +1
function revert(series, hi, lo) {
  return series.map(function (v) { return !ok(v) ? NaN : v > hi ? -1 : v < lo ? 1 : 0; });
}
// lecture "momentum" : au-dessus du seuil haut = +1
function follow(series, hi, lo) {
  return series.map(function (v) { return !ok(v) ? NaN : v > hi ? 1 : v < lo ? -1 : 0; });
}
function slope(series, k, relBand) {
  return series.map(function (v, i) {
    if (i < k || !ok(v) || !ok(series[i - k])) return NaN;
    var d = v - series[i - k], ref = Math.abs(series[i - k]) || 1;
    return d / ref > (relBand || 0) ? 1 : d / ref < -(relBand || 0) ? -1 : 0;
  });
}

/**
 * Calcule tous les indicateurs en series.
 * @param c   { open, high, low, close, volume, time }
 * @param idxClose cloture de l'indice de reference alignee sur les dates du titre (ou null)
 * @returns tableau { id, name, cat, fmt, value[], sig[] | null }
 */
export function computeAll(c, idxClose) {
  var O = c.open, H = c.high, L = c.low, C = c.close, V = c.volume;
  var n = C.length;
  var out = [];
  function add(id, name, cat, fmt, value, sig) { out.push({ id: id, name: name, cat: cat, fmt: fmt, value: value, sig: sig || null }); }

  // ---------- Tendance ----------
  var s20 = ta.sma(C, 20), s50 = ta.sma(C, 50), s100 = ta.sma(C, 100), s200 = ta.sma(C, 200);
  var e12 = ta.ema(C, 12), e26 = ta.ema(C, 26), e50 = ta.ema(C, 50);
  add("sma20", "SMA 20", "Tendance", "p", s20, vsPrice(s20, C));
  add("sma50", "SMA 50", "Tendance", "p", s50, vsPrice(s50, C));
  add("sma100", "SMA 100", "Tendance", "p", s100, vsPrice(s100, C));
  add("sma200", "SMA 200", "Tendance", "p", s200, vsPrice(s200, C));
  add("ema12", "EMA 12", "Tendance", "p", e12, vsPrice(e12, C));
  add("ema26", "EMA 26", "Tendance", "p", e26, vsPrice(e26, C));
  add("ema50", "EMA 50", "Tendance", "p", e50, vsPrice(e50, C));
  var h21 = ta.hma(C, 21);
  add("hma21", "HMA 21 (Hull)", "Tendance", "p", h21, vsPrice(h21, C));
  var km = ta.kama(C, 10);
  add("kama", "KAMA 10 (adaptative)", "Tendance", "p", km, vsPrice(km, C));
  var te = ta.tema(C, 20);
  add("tema20", "TEMA 20", "Tendance", "p", te, vsPrice(te, C));
  var de = ta.dema(C, 20);
  add("dema20", "DEMA 20", "Tendance", "p", de, vsPrice(de, C));
  add("golden", "Croisement SMA 50 / 200", "Tendance", "2", s50.map(function (v, i) { return v - s200[i]; }), diff(s50, s200));
  add("emacross", "Croisement EMA 20 / 50", "Tendance", "2", ta.ema(C, 20).map(function (v, i) { return v - e50[i]; }), diff(ta.ema(C, 20), e50));

  var m = ta.macd(C);
  add("macdh", "MACD histogramme (12,26,9)", "Tendance", "2", m.hist, sign(m.hist));
  add("macd0", "MACD ligne vs zero", "Tendance", "2", m.line, sign(m.line));
  var pp = ta.ppo(C);
  add("ppo", "PPO (%)", "Tendance", "2", pp.line, diff(pp.line, pp.signal, 0.02));

  var d = ta.dmi(H, L, C, 14);
  add("adx", "ADX (14) directionnel", "Tendance", "1", d.adx,
    d.adx.map(function (a, i) { if (!ok(a)) return NaN; return a < 20 ? 0 : d.pdi[i] > d.mdi[i] ? 1 : -1; }));

  var ich = ta.ichimoku(H, L);
  add("cloud", "Ichimoku - nuage", "Tendance", "p", ich.spanA,
    C.map(function (p, i) {
      var a = ich.spanA[i], b = ich.spanB[i];
      if (!ok(a) || !ok(b)) return NaN;
      return p > Math.max(a, b) ? 1 : p < Math.min(a, b) ? -1 : 0;
    }));
  add("tk", "Ichimoku Tenkan / Kijun", "Tendance", "p", ich.kijun, diff(ich.tenkan, ich.kijun));

  var sar = ta.psar(H, L);
  add("sar", "SAR parabolique", "Tendance", "p", sar, vsPrice(sar, C, 0));
  var st = ta.supertrend(H, L, C, 10, 3);
  add("supertrend", "SuperTrend (10,3)", "Tendance", "p", st.line, st.dir.map(function (x, i) { return ok(st.line[i]) ? x : NaN; }));
  var ar = ta.aroon(H, L, 25);
  add("aroon", "Aroon Oscillator (25)", "Tendance", "0", ar.osc, sign(ar.osc, 40));
  var vx = ta.vortex(H, L, C, 14);
  add("vortex", "Vortex (14)", "Tendance", "2", vx.plus.map(function (v, i) { return v - vx.minus[i]; }), diff(vx.plus, vx.minus, 0.03));
  var tr = ta.trix(C, 15);
  add("trix", "TRIX (15)", "Tendance", "1", tr.line, diff(tr.line, tr.signal));
  var lr = ta.linregSlope(C, 20);
  var lrn = lr.slope.map(function (v, i) { return (v / C[i]) * 100; });
  add("linreg", "Pente regression 20 j (%/j)", "Tendance", "2", lrn,
    lrn.map(function (v, i) { if (!ok(v)) return NaN; if (lr.r2[i] < 0.3) return 0; return v > 0.05 ? 1 : v < -0.05 ? -1 : 0; }));
  var ha = ta.heikinAshi(O, H, L, C);
  var haCol = ha.close.map(function (v, i) { return v > ha.open[i] ? 1 : -1; });
  add("heikin", "Heikin Ashi (3 bougies)", "Tendance", "0", haCol,
    haCol.map(function (v, i) { if (i < 2) return NaN; var s = v + haCol[i - 1] + haCol[i - 2]; return s === 3 ? 1 : s === -3 ? -1 : 0; }));
  var dh = ta.shift(ta.highest(H, 20), 1), dl = ta.shift(ta.lowest(L, 20), 1);
  add("donbreak", "Cassure de Donchian (20)", "Tendance", "p", dh,
    C.map(function (p, i) { if (!ok(dh[i])) return NaN; return p > dh[i] ? 1 : p < dl[i] ? -1 : 0; }));
  var y252h = ta.highest(H, 252), y252l = ta.lowest(L, 252);
  var yPos = C.map(function (p, i) { return ok(y252h[i]) ? ((p - y252l[i]) / (y252h[i] - y252l[i] || 1)) * 100 : NaN; });
  add("hi52", "Position dans le range 52 sem. (%)", "Tendance", "0", yPos, follow(yPos, 90, 10));
  var ks = ta.kst(C);
  add("kst", "KST (Know Sure Thing)", "Tendance", "1", ks.line, diff(ks.line, ks.signal));
  var cp = ta.coppock(C);
  add("coppock", "Courbe de Coppock", "Tendance", "1", cp, cp.map(function (v, i) { if (i < 1 || !ok(v) || !ok(cp[i - 1])) return NaN; return v > cp[i - 1] ? 1 : -1; }));

  // ---------- Momentum ----------
  var r14 = ta.rsi(C, 14);
  add("rsi14", "RSI (14)", "Momentum", "1", r14, revert(r14, 70, 30));
  var r2 = ta.rsi(C, 2);
  add("rsi2", "RSI (2) court terme", "Momentum", "1", r2, revert(r2, 90, 10));
  var crsi = ta.connorsRsi(C);
  add("crsi", "RSI de Connors", "Momentum", "1", crsi, revert(crsi, 85, 15));
  var so = ta.stoch(H, L, C, 14, 3);
  add("stochk", "Stochastique %K (14)", "Momentum", "1", so.k, revert(so.k, 80, 20));
  add("stochx", "Stochastique %K / %D", "Momentum", "1", so.d, diff(so.k, so.d, 2));
  var srsi = ta.stochRsi(C, 14);
  add("stochrsi", "Stochastique RSI", "Momentum", "1", srsi, revert(srsi, 80, 20));
  var cc = ta.cci(H, L, C, 20);
  add("cci", "CCI (20)", "Momentum", "0", cc, follow(cc, 100, -100));
  var wr = ta.willr(H, L, C, 14);
  add("willr", "Williams %R (14)", "Momentum", "1", wr, revert(wr, -20, -80));
  var rc = ta.roc(C, 12);
  add("roc12", "ROC (12) %", "Momentum", "2", rc, sign(rc, 0.3));
  var rc63 = ta.roc(C, 63);
  add("roc63", "Momentum 3 mois (%)", "Momentum", "1", rc63, sign(rc63, 2));
  var rc126 = ta.roc(C, 126);
  add("roc126", "Momentum 6 mois (%)", "Momentum", "1", rc126, sign(rc126, 3));
  var mo = ta.momentum(C, 10);
  add("mom10", "Momentum (10)", "Momentum", "2", mo, sign(mo.map(function (v, i) { return (v / C[i]) * 100; }), 0.3));
  var mf = ta.mfi(H, L, C, V, 14);
  add("mfi", "MFI (14)", "Momentum", "1", mf, revert(mf, 80, 20));
  var ts = ta.tsi(C);
  add("tsi", "TSI", "Momentum", "1", ts, sign(ts, 2));
  var uo = ta.ultimate(H, L, C);
  add("uo", "Ultimate Oscillator", "Momentum", "1", uo, revert(uo, 70, 30));
  var ao = ta.awesome(H, L);
  add("ao", "Awesome Oscillator", "Momentum", "2", ao, ao.map(function (v, i) { return !ok(v) ? NaN : (v / C[i]) > 0.002 ? 1 : (v / C[i]) < -0.002 ? -1 : 0; }));
  add("dmi", "DMI (+DI - -DI)", "Momentum", "1", d.pdi.map(function (v, i) { return v - d.mdi[i]; }), diff(d.pdi, d.mdi, 2));
  var cm = ta.cmo(C, 14);
  add("cmo", "Chande Momentum (14)", "Momentum", "0", cm, revert(cm, 50, -50));
  var fi = ta.fisher(H, L, 10);
  add("fisher", "Transformee de Fisher (10)", "Momentum", "2", fi, fi.map(function (v, i) { if (i < 1 || !ok(v) || !ok(fi[i - 1])) return NaN; return v > fi[i - 1] ? 1 : -1; }));
  var sc = ta.stc(C);
  add("stc", "Schaff Trend Cycle", "Momentum", "0", sc,
    sc.map(function (v, i) { if (i < 1 || !ok(v) || !ok(sc[i - 1])) return NaN; return v > sc[i - 1] && v < 75 ? 1 : v < sc[i - 1] && v > 25 ? -1 : 0; }));
  var rv = ta.rvi(O, H, L, C, 10);
  add("rvi", "Relative Vigor Index", "Momentum", "2", rv.line, diff(rv.line, rv.signal, 0.01));
  var el = ta.elder(H, L, C, 13);
  add("elder", "Elder Ray (force acheteurs/vendeurs)", "Momentum", "2", el.bull,
    C.map(function (_, i) {
      if (i < 1 || !ok(el.ema[i - 1])) return NaN;
      var upT = el.ema[i] > el.ema[i - 1];
      if (upT && el.bear[i] < 0 && el.bear[i] > el.bear[i - 1]) return 1;
      if (!upT && el.bull[i] > 0 && el.bull[i] < el.bull[i - 1]) return -1;
      return 0;
    }));
  var bp = ta.bop(O, H, L, C, 14);
  add("bop", "Balance of Power (14)", "Momentum", "2", bp, sign(bp, 0.05));
  var qs = ta.qstick(O, C, 14);
  add("qstick", "Qstick (14)", "Momentum", "2", qs, sign(qs.map(function (v, i) { return (v / C[i]) * 100; }), 0.05));
  var zs = ta.zscore(C, 20);
  add("zscore", "Z-score 20 j", "Momentum", "2", zs, revert(zs, 2, -2));
  add("rsidiv", "Divergence RSI", "Momentum", "1", r14,
    C.map(function (p, i) {
      if (i < 25 || !ok(r14[i])) return NaN;
      var lo = i - 20, hi = i - 5, jl = lo, jh = lo;
      for (var j = lo; j <= hi; j++) { if (C[j] < C[jl]) jl = j; if (C[j] > C[jh]) jh = j; }
      if (p < C[jl] && r14[i] > r14[jl] + 2 && r14[i] < 45) return 1;
      if (p > C[jh] && r14[i] < r14[jh] - 2 && r14[i] > 55) return -1;
      return 0;
    }));

  // ---------- Volatilite ----------
  var bb = ta.bollinger(C, 20, 2);
  add("bbpct", "Bandes de Bollinger %B", "Volatilite", "2", bb.pctB, revert(bb.pctB, 1, 0));
  add("bbw", "Largeur de Bollinger (%)", "Volatilite", "1", bb.width, null);
  var a14 = ta.atr(H, L, C, 14);
  add("atr", "ATR (14)", "Volatilite", "2", a14, null);
  add("natr", "ATR en % du cours", "Volatilite", "2", a14.map(function (v, i) { return (v / C[i]) * 100; }), null);
  var kc = ta.keltner(H, L, C, 20, 2);
  add("keltner", "Canaux de Keltner (cassure)", "Volatilite", "p", kc.mid,
    C.map(function (p, i) { if (!ok(kc.upper[i])) return NaN; return p > kc.upper[i] ? 1 : p < kc.lower[i] ? -1 : 0; }));
  var kc15 = ta.keltner(H, L, C, 20, 1.5);
  var squeeze = C.map(function (_, i) { return ok(bb.upper[i]) && ok(kc15.upper[i]) ? (bb.upper[i] < kc15.upper[i] && bb.lower[i] > kc15.lower[i] ? 1 : 0) : NaN; });
  add("squeeze", "Squeeze Bollinger / Keltner", "Volatilite", "0", squeeze,
    C.map(function (p, i) {
      if (i < 4 || !ok(squeeze[i])) return NaN;
      var released = squeeze[i] === 0 && (squeeze[i - 1] === 1 || squeeze[i - 2] === 1 || squeeze[i - 3] === 1);
      if (!released) return 0;
      return p > s20[i] ? 1 : -1;
    }));
  add("stdev", "Ecart-type (20)", "Volatilite", "2", ta.stdev(C, 20), null);
  add("chop", "Choppiness Index", "Volatilite", "1", ta.choppiness(H, L, C, 14), null);
  add("hv30", "Volatilite historique 30 j", "Volatilite", "pct", ta.histVolSeries(C, 30), null);
  var dlo = ta.lowest(L, 20);
  var dmid = ta.highest(H, 20).map(function (v, i) { return (v + dlo[i]) / 2; });
  add("donchian", "Canaux de Donchian (milieu)", "Volatilite", "p", dmid, null);
  add("ulcer", "Ulcer Index (risque de baisse)", "Volatilite", "2", ta.ulcer(C, 14), null);
  add("mass", "Mass Index", "Volatilite", "1", ta.massIndex(H, L), null);

  // ---------- Volume ----------
  var ob = ta.obv(C, V);
  var obS = ta.sma(ob, 20);
  add("obv", "OBV (tendance 10 j)", "Volume", "M", ob, slope(ob, 10, 0.0));
  add("obvma", "OBV vs sa moyenne 20", "Volume", "M", obS, diff(ob, obS));
  var cf = ta.cmf(H, L, C, V, 20);
  add("cmf", "Chaikin Money Flow", "Volume", "2", cf, sign(cf, 0.05));
  var ad = ta.adLine(H, L, C, V);
  add("ad", "Accumulation / Distribution", "Volume", "M", ad, slope(ad, 10, 0.0));
  var co = ta.chaikinOsc(H, L, C, V);
  add("chaikin", "Oscillateur de Chaikin", "Volume", "M", co, sign(co));
  var vw = ta.vwap(H, L, C, V, 20);
  add("vwap", "VWAP 20 j", "Volume", "p", vw, vsPrice(vw, C));
  var vm = ta.vwma(C, V, 20);
  add("vwma", "VWMA 20 (moyenne ponderee volume)", "Volume", "p", vm, vsPrice(vm, C));
  var fx = ta.forceIndex(C, V, 13);
  add("force", "Force Index (13)", "Volume", "M", fx, sign(fx));
  var eo = ta.eom(H, L, V, 14);
  add("eom", "Ease of Movement", "Volume", "2", eo, sign(eo, 0.01));
  var rvol = ta.relVolume(V, 20);
  add("relvol", "Volume relatif 20 j", "Volume", "x", rvol, null);
  add("volconf", "Confirmation par le volume", "Volume", "x", rvol,
    C.map(function (p, i) { if (i < 1 || !ok(rvol[i])) return NaN; if (rvol[i] < 1.5) return 0; return p > C[i - 1] ? 1 : p < C[i - 1] ? -1 : 0; }));
  var kl = ta.klinger(H, L, C, V);
  add("klinger", "Oscillateur de Klinger", "Volume", "M", kl.line, diff(kl.line, kl.signal));
  var pv = ta.pvt(C, V);
  add("pvt", "Price Volume Trend", "Volume", "M", pv, slope(pv, 10, 0.0));
  var nv = ta.nvi(C, V), nvE = ta.ema(nv, 255);
  add("nvi", "Negative Volume Index", "Volume", "0", nv, diff(nv, nvE));

  // ---------- Structure ----------
  var pvt0 = ta.pivots(H, L, C);
  add("pivot", "Point pivot (P)", "Structure", "p", pvt0.p, vsPrice(pvt0.p, C));
  add("r1s1", "Pivots R1 / S1", "Structure", "p", pvt0.r1,
    C.map(function (p, i) { if (!ok(pvt0.r1[i])) return NaN; return p > pvt0.r1[i] ? 1 : p < pvt0.s1[i] ? -1 : 0; }));
  var fb = ta.fib618(H, L, 60);
  add("fib", "Retracement Fibonacci 61,8 %", "Structure", "p", fb, vsPrice(fb, C));
  var dist200 = C.map(function (p, i) { return ok(s200[i]) ? ((p - s200[i]) / s200[i]) * 100 : NaN; });
  add("dist200", "Ecart a la SMA 200 (%)", "Structure", "1", dist200, revert(dist200, 25, -25));

  var bcVal = nanArr(n), corrVal = nanArr(n), rs21 = nanArr(n), rs63 = nanArr(n);
  if (idxClose && idxClose.length === n) {
    var bc = ta.betaCorr(C.slice(-250), idxClose.slice(-250));
    bcVal[n - 1] = bc.beta; corrVal[n - 1] = bc.corr;
    for (var i = 63; i < n; i++) {
      if (ok(idxClose[i]) && ok(idxClose[i - 21])) rs21[i] = (C[i] / C[i - 21] - idxClose[i] / idxClose[i - 21]) * 100;
      if (ok(idxClose[i]) && ok(idxClose[i - 63])) rs63[i] = (C[i] / C[i - 63] - idxClose[i] / idxClose[i - 63]) * 100;
    }
  }
  add("beta", "Beta 1 an", "Structure", "2", bcVal, null);
  add("corr", "Correlation a l'indice", "Structure", "2", corrVal, null);
  add("rs21", "Force relative 1 mois vs indice (%)", "Structure", "1", rs21, sign(rs21, 0.5));
  add("rs63", "Force relative 3 mois vs indice (%)", "Structure", "1", rs63, sign(rs63, 1));

  // ---------- Chandeliers ----------
  var body = C.map(function (v, i) { return Math.abs(v - O[i]); });
  var avgBody = ta.sma(body, 14);
  var sig_engulf = C.map(function (p, i) {
      if (i < 1) return NaN;
      var prevRed = C[i - 1] < O[i - 1], prevGreen = C[i - 1] > O[i - 1];
      if (prevRed && p > O[i] && O[i] <= C[i - 1] && p >= O[i - 1]) return 1;
      if (prevGreen && p < O[i] && O[i] >= C[i - 1] && p <= O[i - 1]) return -1;
      return 0;
    });
  add("engulf", "Avalement (engulfing)", "Chandeliers", "pat", sig_engulf, sig_engulf);
  var sig_hammer = C.map(function (p, i) {
      if (!ok(s20[i]) || !ok(avgBody[i])) return NaN;
      var b = Math.max(body[i], avgBody[i] * 0.1), top = Math.max(p, O[i]), bot = Math.min(p, O[i]);
      var lowerS = bot - L[i], upperS = H[i] - top;
      if (lowerS >= 2 * b && upperS <= b && p < s20[i]) return 1;
      if (upperS >= 2 * b && lowerS <= b && p > s20[i]) return -1;
      return 0;
    });
  add("hammer", "Marteau / Etoile filante", "Chandeliers", "pat", sig_hammer, sig_hammer);
  var sig_star = C.map(function (p, i) {
      if (i < 2 || !ok(avgBody[i])) return NaN;
      var big1 = body[i - 2] > avgBody[i], small2 = body[i - 1] < avgBody[i] * 0.5, mid1 = (O[i - 2] + C[i - 2]) / 2;
      if (big1 && small2 && C[i - 2] < O[i - 2] && p > O[i] && p > mid1) return 1;
      if (big1 && small2 && C[i - 2] > O[i - 2] && p < O[i] && p < mid1) return -1;
      return 0;
    });
  add("star", "Etoile du matin / du soir", "Chandeliers", "pat", sig_star, sig_star);
  var sig_soldiers = C.map(function (p, i) {
      if (i < 3) return NaN;
      var up = true, dn = true;
      for (var k = i - 2; k <= i; k++) {
        if (!(C[k] > O[k] && C[k] > C[k - 1])) up = false;
        if (!(C[k] < O[k] && C[k] < C[k - 1])) dn = false;
      }
      return up ? 1 : dn ? -1 : 0;
    });
  add("soldiers", "Trois soldats / trois corbeaux", "Chandeliers", "pat", sig_soldiers, sig_soldiers);
  add("doji", "Doji (indecision)", "Chandeliers", "yn",
    C.map(function (p, i) { var r = H[i] - L[i]; return r > 0 && body[i] / r < 0.1 ? 1 : 0; }), null);

  return out;
}

export function fmtValue(v, fmt, cur) {
  if (v == null || !ok(v)) return "-";
  function fr(x, d) { return x.toFixed(d).replace(".", ","); }
  switch (fmt) {
    case "p": return fr(v, 2) + (cur ? " " + cur : "");
    case "0": return fr(v, 0);
    case "1": return fr(v, 1);
    case "pct": return fr(v, 1) + " %";
    case "M": return fr(v / 1e6, 2) + " M";
    case "x": return fr(v, 2) + " x";
    case "pat": return v > 0 ? "haussier" : v < 0 ? "baissier" : "aucun";
    case "yn": return v > 0 ? "oui" : "non";
    default: return fr(v, 2);
  }
}

// Instantane a la date i (par defaut la derniere seance) : lignes affichables
export function rowsAt(all, i, cur) {
  return all.map(function (ind) {
    var k = i == null ? ind.value.length - 1 : i;
    var s = ind.sig ? ind.sig[k] : null;
    return {
      id: ind.id, name: ind.name, cat: ind.cat,
      val: fmtValue(ind.value[k], ind.fmt, cur),
      sig: ind.sig ? (ok(s) ? s : null) : null,
      info: !ind.sig,
    };
  });
}

export function directionalIds(all) {
  return all.filter(function (x) { return !!x.sig; }).map(function (x) { return x.id; });
}
