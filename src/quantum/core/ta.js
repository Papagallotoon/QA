// Analyse technique : toutes les fonctions renvoient une SERIE complete
// (meme longueur que l'entree, NaN tant que la fenetre n'est pas remplie).
// Travailler en series permet de recalculer chaque indicateur a n'importe quelle
// date passee : c'est ce qui rend possible le backtest et l'auto-apprentissage.
// Aucune dependance : ce fichier tourne dans l'app (Metro) ET sur le serveur (Node).

export function last(a) { return a && a.length ? a[a.length - 1] : NaN; }
export function at(a, i) { return a && i >= 0 && i < a.length ? a[i] : NaN; }
function nan(n) { var o = new Array(n); for (var i = 0; i < n; i++) o[i] = NaN; return o; }
function ok(v) { return v === v && v != null && isFinite(v); }

export function sma(src, n) {
  var out = nan(src.length), sum = 0, cnt = 0;
  for (var i = 0; i < src.length; i++) {
    var v = src[i];
    if (ok(v)) { sum += v; cnt++; }
    if (i >= n) { var o = src[i - n]; if (ok(o)) { sum -= o; cnt--; } }
    if (i >= n - 1 && cnt === n) out[i] = sum / n;
  }
  return out;
}

// moyenne exponentielle, amorcee par une SMA des n premieres valeurs valides
function smooth(src, n, alpha) {
  var out = nan(src.length), prev = NaN, buf = [];
  for (var i = 0; i < src.length; i++) {
    var v = src[i];
    if (!ok(v)) { if (ok(prev)) out[i] = prev; continue; }
    if (!ok(prev)) {
      buf.push(v);
      if (buf.length > n) buf.shift();
      if (buf.length === n) { prev = buf.reduce(function (a, b) { return a + b; }, 0) / n; out[i] = prev; }
      continue;
    }
    prev = alpha * v + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}
export function ema(src, n) { return smooth(src, n, 2 / (n + 1)); }
export function rma(src, n) { return smooth(src, n, 1 / n); }

export function wma(src, n) {
  var out = nan(src.length), denom = (n * (n + 1)) / 2;
  for (var i = n - 1; i < src.length; i++) {
    var s = 0, good = true;
    for (var j = 0; j < n; j++) { var v = src[i - n + 1 + j]; if (!ok(v)) { good = false; break; } s += v * (j + 1); }
    if (good) out[i] = s / denom;
  }
  return out;
}

export function hma(src, n) {
  var half = wma(src, Math.round(n / 2)), full = wma(src, n);
  return wma(src.map(function (_, i) { return 2 * half[i] - full[i]; }), Math.round(Math.sqrt(n)));
}

export function dema(src, n) { var e1 = ema(src, n), e2 = ema(e1, n); return e1.map(function (v, i) { return 2 * v - e2[i]; }); }
export function tema(src, n) {
  var e1 = ema(src, n), e2 = ema(e1, n), e3 = ema(e2, n);
  return e1.map(function (v, i) { return 3 * v - 3 * e2[i] + e3[i]; });
}

// Kaufman Adaptive Moving Average
export function kama(src, n, fast, slow) {
  fast = fast || 2; slow = slow || 30;
  var fsc = 2 / (fast + 1), ssc = 2 / (slow + 1);
  var out = nan(src.length), prev = NaN;
  for (var i = n; i < src.length; i++) {
    var change = Math.abs(src[i] - src[i - n]), vol = 0;
    for (var j = i - n + 1; j <= i; j++) vol += Math.abs(src[j] - src[j - 1]);
    var er = vol === 0 ? 0 : change / vol;
    var sc = Math.pow(er * (fsc - ssc) + ssc, 2);
    prev = ok(prev) ? prev + sc * (src[i] - prev) : src[i];
    out[i] = prev;
  }
  return out;
}

export function vwma(c, v, n) {
  var out = nan(c.length);
  for (var i = n - 1; i < c.length; i++) {
    var pv = 0, vv = 0;
    for (var j = i - n + 1; j <= i; j++) { pv += c[j] * (v[j] || 0); vv += v[j] || 0; }
    out[i] = vv === 0 ? c[i] : pv / vv;
  }
  return out;
}

export function stdev(src, n) {
  var out = nan(src.length);
  for (var i = n - 1; i < src.length; i++) {
    var m = 0;
    for (var j = i - n + 1; j <= i; j++) m += src[j];
    m /= n;
    var s = 0;
    for (var k = i - n + 1; k <= i; k++) s += (src[k] - m) * (src[k] - m);
    out[i] = Math.sqrt(s / n);
  }
  return out;
}

export function highest(src, n) {
  var out = nan(src.length);
  for (var i = n - 1; i < src.length; i++) { var m = -Infinity; for (var j = i - n + 1; j <= i; j++) if (src[j] > m) m = src[j]; out[i] = m; }
  return out;
}
export function lowest(src, n) {
  var out = nan(src.length);
  for (var i = n - 1; i < src.length; i++) { var m = Infinity; for (var j = i - n + 1; j <= i; j++) if (src[j] < m) m = src[j]; out[i] = m; }
  return out;
}
export function shift(src, k) {
  var out = nan(src.length);
  for (var i = 0; i < src.length; i++) if (i - k >= 0 && i - k < src.length) out[i] = src[i - k];
  return out;
}

export function trueRange(h, l, c) {
  var out = [h[0] - l[0]];
  for (var i = 1; i < c.length; i++) out.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
  return out;
}
export function atr(h, l, c, n) { return rma(trueRange(h, l, c), n); }

export function rsi(close, n) {
  var g = [NaN], d = [NaN];
  for (var i = 1; i < close.length; i++) { var x = close[i] - close[i - 1]; g.push(x > 0 ? x : 0); d.push(x < 0 ? -x : 0); }
  var ag = rma(g, n), al = rma(d, n);
  return close.map(function (_, i) {
    if (!ok(ag[i]) || !ok(al[i])) return NaN;
    if (al[i] === 0) return ag[i] === 0 ? 50 : 100;
    return 100 - 100 / (1 + ag[i] / al[i]);
  });
}

export function macd(close, f, s, sg) {
  var a = ema(close, f || 12), b = ema(close, s || 26);
  var line = close.map(function (_, i) { return a[i] - b[i]; });
  var signal = ema(line, sg || 9);
  return { line: line, signal: signal, hist: line.map(function (v, i) { return v - signal[i]; }) };
}

export function ppo(close) {
  var a = ema(close, 12), b = ema(close, 26);
  var line = close.map(function (_, i) { return ((a[i] - b[i]) / b[i]) * 100; });
  var signal = ema(line, 9);
  return { line: line, signal: signal, hist: line.map(function (v, i) { return v - signal[i]; }) };
}

export function dmi(h, l, c, n) {
  var plus = [0], minus = [0];
  for (var i = 1; i < c.length; i++) {
    var up = h[i] - h[i - 1], dn = l[i - 1] - l[i];
    plus.push(up > dn && up > 0 ? up : 0);
    minus.push(dn > up && dn > 0 ? dn : 0);
  }
  var tr = rma(trueRange(h, l, c), n);
  var pdi = rma(plus, n).map(function (v, i) { return tr[i] ? (100 * v) / tr[i] : NaN; });
  var mdi = rma(minus, n).map(function (v, i) { return tr[i] ? (100 * v) / tr[i] : NaN; });
  var dx = pdi.map(function (v, i) { var s = v + mdi[i]; return !ok(s) ? NaN : s === 0 ? 0 : (100 * Math.abs(v - mdi[i])) / s; });
  return { pdi: pdi, mdi: mdi, adx: rma(dx, n) };
}

export function stoch(h, l, c, n, d) {
  var hh = highest(h, n), ll = lowest(l, n);
  var k = c.map(function (v, i) { if (!ok(hh[i])) return NaN; return hh[i] === ll[i] ? 50 : ((v - ll[i]) / (hh[i] - ll[i])) * 100; });
  return { k: k, d: sma(k, d) };
}

export function stochRsi(close, n) {
  var r = rsi(close, n), out = nan(close.length);
  for (var i = 0; i < r.length; i++) {
    if (i < n - 1) continue;
    var hh = -Infinity, ll = Infinity, good = true;
    for (var j = i - n + 1; j <= i; j++) { if (!ok(r[j])) { good = false; break; } if (r[j] > hh) hh = r[j]; if (r[j] < ll) ll = r[j]; }
    if (good) out[i] = hh === ll ? 50 : ((r[i] - ll) / (hh - ll)) * 100;
  }
  return out;
}

export function typical(h, l, c) { return c.map(function (_, i) { return (h[i] + l[i] + c[i]) / 3; }); }

export function cci(h, l, c, n) {
  var tp = typical(h, l, c), m = sma(tp, n), out = nan(c.length);
  for (var i = n - 1; i < tp.length; i++) {
    var md = 0;
    for (var j = i - n + 1; j <= i; j++) md += Math.abs(tp[j] - m[i]);
    md /= n;
    out[i] = md === 0 ? 0 : (tp[i] - m[i]) / (0.015 * md);
  }
  return out;
}

export function willr(h, l, c, n) {
  var hh = highest(h, n), ll = lowest(l, n);
  return c.map(function (v, i) { if (!ok(hh[i])) return NaN; return hh[i] === ll[i] ? -50 : ((hh[i] - v) / (hh[i] - ll[i])) * -100; });
}

export function roc(close, n) { return close.map(function (v, i) { return i < n ? NaN : ((v - close[i - n]) / close[i - n]) * 100; }); }
export function momentum(close, n) { return close.map(function (v, i) { return i < n ? NaN : v - close[i - n]; }); }

export function mfi(h, l, c, v, n) {
  var tp = typical(h, l, c), out = nan(c.length);
  for (var i = n; i < c.length; i++) {
    var pos = 0, neg = 0;
    for (var j = i - n + 1; j <= i; j++) {
      var flow = tp[j] * (v[j] || 0);
      if (tp[j] > tp[j - 1]) pos += flow; else if (tp[j] < tp[j - 1]) neg += flow;
    }
    out[i] = neg === 0 ? (pos === 0 ? 50 : 100) : 100 - 100 / (1 + pos / neg);
  }
  return out;
}

export function tsi(close, r, s) {
  var m = [NaN];
  for (var i = 1; i < close.length; i++) m.push(close[i] - close[i - 1]);
  var a = ema(ema(m, r || 25), s || 13);
  var b = ema(ema(m.map(Math.abs), r || 25), s || 13);
  return a.map(function (v, i) { return b[i] ? (100 * v) / b[i] : NaN; });
}

export function ultimate(h, l, c) {
  var bp = [NaN], tr = [NaN];
  for (var i = 1; i < c.length; i++) {
    var lo = Math.min(l[i], c[i - 1]);
    bp.push(c[i] - lo);
    tr.push(Math.max(h[i], c[i - 1]) - lo);
  }
  function avg(n, i) { var b = 0, t = 0; for (var j = i - n + 1; j <= i; j++) { b += bp[j]; t += tr[j]; } return t === 0 ? 0 : b / t; }
  return c.map(function (_, i) { return i < 29 ? NaN : (100 * (4 * avg(7, i) + 2 * avg(14, i) + avg(28, i))) / 7; });
}

export function median(h, l) { return h.map(function (_, i) { return (h[i] + l[i]) / 2; }); }
export function awesome(h, l) { var m = median(h, l), f = sma(m, 5), s = sma(m, 34); return m.map(function (_, i) { return f[i] - s[i]; }); }

export function cmo(close, n) {
  var out = nan(close.length);
  for (var i = n; i < close.length; i++) {
    var up = 0, dn = 0;
    for (var j = i - n + 1; j <= i; j++) { var d = close[j] - close[j - 1]; if (d > 0) up += d; else dn -= d; }
    out[i] = up + dn === 0 ? 0 : (100 * (up - dn)) / (up + dn);
  }
  return out;
}

// RSI de Connors : RSI(3) + RSI de la serie de hausses/baisses + rang du rendement
export function connorsRsi(close) {
  var r3 = rsi(close, 3);
  var streak = [0];
  for (var i = 1; i < close.length; i++) {
    var p = streak[i - 1];
    streak.push(close[i] > close[i - 1] ? (p > 0 ? p + 1 : 1) : close[i] < close[i - 1] ? (p < 0 ? p - 1 : -1) : 0);
  }
  var rs = rsi(streak, 2), r1 = roc(close, 1), out = nan(close.length);
  for (var k = 101; k < close.length; k++) {
    var cnt = 0;
    for (var j = k - 100; j < k; j++) if (r1[j] < r1[k]) cnt++;
    out[k] = (r3[k] + rs[k] + cnt) / 3;
  }
  return out;
}

export function fisher(h, l, n) {
  var m = median(h, l), hh = highest(m, n), ll = lowest(m, n);
  var out = nan(h.length), val = 0, prev = 0;
  for (var i = n - 1; i < h.length; i++) {
    var rng = hh[i] - ll[i];
    var x = rng === 0 ? 0 : 0.66 * ((m[i] - ll[i]) / rng - 0.5) + 0.67 * val;
    x = Math.max(-0.999, Math.min(0.999, x));
    val = x;
    prev = 0.5 * Math.log((1 + x) / (1 - x)) + 0.5 * prev;
    out[i] = prev;
  }
  return out;
}

// Schaff Trend Cycle (MACD 23/50 passe deux fois dans un stochastique)
export function stc(close) {
  var a = ema(close, 23), b = ema(close, 50);
  var m = close.map(function (_, i) { return a[i] - b[i]; });
  function stochOf(src, n) {
    var hh = highest(src, n), ll = lowest(src, n);
    return src.map(function (v, i) { return !ok(hh[i]) ? NaN : hh[i] === ll[i] ? 50 : ((v - ll[i]) / (hh[i] - ll[i])) * 100; });
  }
  var k1 = smooth(stochOf(m, 10), 3, 0.5);
  var k2 = smooth(stochOf(k1, 10), 3, 0.5);
  return k2;
}

// Relative Vigor Index
export function rvi(o, h, l, c, n) {
  var num = c.map(function (v, i) { return v - o[i]; }), den = h.map(function (v, i) { return v - l[i]; });
  var sn = sma(wma(num, 4), n), sd = sma(wma(den, 4), n);
  var line = sn.map(function (v, i) { return sd[i] ? v / sd[i] : NaN; });
  return { line: line, signal: wma(line, 4) };
}

export function elder(h, l, c, n) {
  var e = ema(c, n || 13);
  return { ema: e, bull: h.map(function (v, i) { return v - e[i]; }), bear: l.map(function (v, i) { return v - e[i]; }) };
}

export function bop(o, h, l, c, n) {
  var raw = c.map(function (v, i) { var r = h[i] - l[i]; return r === 0 ? 0 : (v - o[i]) / r; });
  return sma(raw, n || 14);
}
export function qstick(o, c, n) { return sma(c.map(function (v, i) { return v - o[i]; }), n || 14); }

export function trix(close, n) {
  var e3 = ema(ema(ema(close, n), n), n);
  var line = e3.map(function (v, i) { return i === 0 ? NaN : ((v - e3[i - 1]) / e3[i - 1]) * 10000; });
  return { line: line, signal: ema(line, 9) };
}

export function kst(close) {
  var r1 = sma(roc(close, 10), 10), r2 = sma(roc(close, 15), 10), r3 = sma(roc(close, 20), 10), r4 = sma(roc(close, 30), 15);
  var line = close.map(function (_, i) { return r1[i] + 2 * r2[i] + 3 * r3[i] + 4 * r4[i]; });
  return { line: line, signal: sma(line, 9) };
}

export function coppock(close) {
  var a = roc(close, 14), b = roc(close, 11);
  return wma(close.map(function (_, i) { return a[i] + b[i]; }), 10);
}

export function vortex(h, l, c, n) {
  var vp = [NaN], vm = [NaN];
  for (var i = 1; i < c.length; i++) { vp.push(Math.abs(h[i] - l[i - 1])); vm.push(Math.abs(l[i] - h[i - 1])); }
  var tr = trueRange(h, l, c), out = { plus: nan(c.length), minus: nan(c.length) };
  for (var k = n; k < c.length; k++) {
    var a = 0, b = 0, t = 0;
    for (var j = k - n + 1; j <= k; j++) { a += vp[j]; b += vm[j]; t += tr[j]; }
    out.plus[k] = t ? a / t : NaN; out.minus[k] = t ? b / t : NaN;
  }
  return out;
}

export function linregSlope(src, n) {
  var out = nan(src.length), r2 = nan(src.length);
  var sx = (n * (n - 1)) / 2, sxx = ((n - 1) * n * (2 * n - 1)) / 6;
  for (var i = n - 1; i < src.length; i++) {
    var sy = 0, sxy = 0, syy = 0;
    for (var j = 0; j < n; j++) { var y = src[i - n + 1 + j]; sy += y; sxy += j * y; syy += y * y; }
    var den = n * sxx - sx * sx;
    var slope = (n * sxy - sx * sy) / den;
    var num = n * sxy - sx * sy, d2 = (n * sxx - sx * sx) * (n * syy - sy * sy);
    out[i] = slope; r2[i] = d2 > 0 ? (num * num) / d2 : 0;
  }
  return { slope: out, r2: r2 };
}

export function heikinAshi(o, h, l, c) {
  var ho = [], hc = [];
  for (var i = 0; i < c.length; i++) {
    hc.push((o[i] + h[i] + l[i] + c[i]) / 4);
    ho.push(i === 0 ? (o[0] + c[0]) / 2 : (ho[i - 1] + hc[i - 1]) / 2);
  }
  return { open: ho, close: hc };
}

export function bollinger(close, n, k) {
  var m = sma(close, n), sd = stdev(close, n);
  var up = m.map(function (v, i) { return v + k * sd[i]; }), dn = m.map(function (v, i) { return v - k * sd[i]; });
  return {
    mid: m, upper: up, lower: dn,
    pctB: close.map(function (v, i) { return up[i] === dn[i] ? 0.5 : (v - dn[i]) / (up[i] - dn[i]); }),
    width: m.map(function (v, i) { return v ? ((up[i] - dn[i]) / v) * 100 : NaN; }),
  };
}

export function keltner(h, l, c, n, mult) {
  var mid = ema(c, n), a = atr(h, l, c, n);
  return { mid: mid, upper: mid.map(function (v, i) { return v + mult * a[i]; }), lower: mid.map(function (v, i) { return v - mult * a[i]; }) };
}

export function choppiness(h, l, c, n) {
  var tr = trueRange(h, l, c), out = nan(c.length);
  for (var i = n; i < c.length; i++) {
    var sum = 0, hh = -Infinity, ll = Infinity;
    for (var j = i - n + 1; j <= i; j++) { sum += tr[j]; if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
    out[i] = hh - ll <= 0 ? 50 : (100 * Math.log10(sum / (hh - ll))) / Math.log10(n);
  }
  return out;
}

export function ulcer(close, n) {
  var hh = highest(close, n), dd = close.map(function (v, i) { return ok(hh[i]) ? Math.pow(((v - hh[i]) / hh[i]) * 100, 2) : NaN; });
  return sma(dd, n).map(function (v) { return Math.sqrt(v); });
}

export function massIndex(h, l) {
  var r = h.map(function (v, i) { return v - l[i]; }), e1 = ema(r, 9), e2 = ema(e1, 9);
  return sma(e1.map(function (v, i) { return e2[i] ? v / e2[i] : NaN; }), 25).map(function (v) { return v * 25; });
}

export function logReturns(close) {
  var out = [];
  for (var i = 1; i < close.length; i++) out.push(Math.log(close[i] / close[i - 1]));
  return out;
}

// volatilite historique annualisee (%) en serie
export function histVolSeries(close, n) {
  var r = [NaN].concat(logReturns(close)), sd = stdev(r, n);
  return sd.map(function (v) { return v * Math.sqrt(n / (n - 1)) * Math.sqrt(252) * 100; });
}
export function histVol(close, n) { return last(histVolSeries(close, n)); }

export function obv(c, v) {
  var out = [0];
  for (var i = 1; i < c.length; i++) out.push(out[i - 1] + (c[i] > c[i - 1] ? (v[i] || 0) : c[i] < c[i - 1] ? -(v[i] || 0) : 0));
  return out;
}

export function moneyFlowMult(h, l, c) {
  return c.map(function (_, i) { var r = h[i] - l[i]; return r === 0 ? 0 : ((c[i] - l[i]) - (h[i] - c[i])) / r; });
}
export function adLine(h, l, c, v) {
  var mf = moneyFlowMult(h, l, c), out = [], acc = 0;
  for (var i = 0; i < c.length; i++) { acc += mf[i] * (v[i] || 0); out.push(acc); }
  return out;
}
export function cmf(h, l, c, v, n) {
  var mf = moneyFlowMult(h, l, c), out = nan(c.length);
  for (var i = n - 1; i < c.length; i++) {
    var num = 0, den = 0;
    for (var j = i - n + 1; j <= i; j++) { num += mf[j] * (v[j] || 0); den += v[j] || 0; }
    out[i] = den === 0 ? 0 : num / den;
  }
  return out;
}
export function chaikinOsc(h, l, c, v) {
  var ad = adLine(h, l, c, v), a = ema(ad, 3), b = ema(ad, 10);
  return a.map(function (x, i) { return x - b[i]; });
}
export function vwap(h, l, c, v, n) { return vwma(typical(h, l, c), v, n); }

export function forceIndex(c, v, n) {
  var f = [NaN];
  for (var i = 1; i < c.length; i++) f.push((c[i] - c[i - 1]) * (v[i] || 0));
  return ema(f, n);
}

export function eom(h, l, v, n) {
  var e = [NaN];
  for (var i = 1; i < h.length; i++) {
    var mid = (h[i] + l[i]) / 2 - (h[i - 1] + l[i - 1]) / 2;
    var rng = Math.max(h[i] - l[i], 1e-9), vol = v[i] || 0;
    // normalise par le prix pour rester comparable d'une action a l'autre
    e.push(vol === 0 ? 0 : (mid / ((h[i] + l[i]) / 2)) * 100 * (rng / ((h[i] + l[i]) / 2)) * 100);
  }
  return sma(e, n);
}

export function relVolume(v, n) {
  var out = nan(v.length);
  for (var i = n; i < v.length; i++) {
    var s = 0;
    for (var j = i - n; j < i; j++) s += v[j] || 0;
    out[i] = s === 0 ? NaN : (v[i] || 0) / (s / n);
  }
  return out;
}

export function klinger(h, l, c, v) {
  var vf = [0];
  for (var i = 1; i < c.length; i++) {
    var t = h[i] + l[i] + c[i] > h[i - 1] + l[i - 1] + c[i - 1] ? 1 : -1;
    vf.push((v[i] || 0) * t);
  }
  var a = ema(vf, 34), b = ema(vf, 55);
  var line = a.map(function (x, i) { return x - b[i]; });
  return { line: line, signal: ema(line, 13) };
}

export function pvt(c, v) {
  var out = [0];
  for (var i = 1; i < c.length; i++) out.push(out[i - 1] + ((c[i] - c[i - 1]) / c[i - 1]) * (v[i] || 0));
  return out;
}

// Negative Volume Index : progresse seulement les jours de volume en baisse
export function nvi(c, v) {
  var out = [1000];
  for (var i = 1; i < c.length; i++) out.push((v[i] || 0) < (v[i - 1] || 0) ? out[i - 1] * (c[i] / c[i - 1]) : out[i - 1]);
  return out;
}

export function psar(h, l) {
  var out = nan(h.length), af0 = 0.02, step = 0.02, maxAf = 0.2;
  var up = true, sar = l[0], ep = h[0], a = af0;
  out[0] = sar;
  for (var i = 1; i < h.length; i++) {
    sar = sar + a * (ep - sar);
    if (up) {
      sar = Math.min(sar, l[i - 1], i > 1 ? l[i - 2] : l[i - 1]);
      if (l[i] < sar) { up = false; sar = ep; ep = l[i]; a = af0; }
      else if (h[i] > ep) { ep = h[i]; a = Math.min(a + step, maxAf); }
    } else {
      sar = Math.max(sar, h[i - 1], i > 1 ? h[i - 2] : h[i - 1]);
      if (h[i] > sar) { up = true; sar = ep; ep = h[i]; a = af0; }
      else if (l[i] < ep) { ep = l[i]; a = Math.min(a + step, maxAf); }
    }
    out[i] = sar;
  }
  return out;
}

export function supertrend(h, l, c, n, mult) {
  var a = atr(h, l, c, n), upper = [], lower = [], dir = [], st = [];
  for (var i = 0; i < c.length; i++) {
    var mid = (h[i] + l[i]) / 2, bu = mid + mult * a[i], bl = mid - mult * a[i];
    if (i === 0 || !ok(a[i]) || !ok(upper[i - 1])) { upper.push(bu); lower.push(bl); dir.push(1); st.push(ok(a[i]) ? bl : NaN); continue; }
    upper.push(bu < upper[i - 1] || c[i - 1] > upper[i - 1] ? bu : upper[i - 1]);
    lower.push(bl > lower[i - 1] || c[i - 1] < lower[i - 1] ? bl : lower[i - 1]);
    var d = c[i] > upper[i - 1] ? 1 : c[i] < lower[i - 1] ? -1 : dir[i - 1];
    dir.push(d);
    st.push(d > 0 ? lower[i] : upper[i]);
  }
  return { line: st, dir: dir };
}

export function aroon(h, l, n) {
  var up = nan(h.length), dn = nan(h.length);
  for (var i = n; i < h.length; i++) {
    var hi = i, li = i, hh = -Infinity, ll = Infinity;
    for (var j = i - n; j <= i; j++) { if (h[j] >= hh) { hh = h[j]; hi = j; } if (l[j] <= ll) { ll = l[j]; li = j; } }
    up[i] = ((n - (i - hi)) / n) * 100; dn[i] = ((n - (i - li)) / n) * 100;
  }
  return { up: up, down: dn, osc: up.map(function (v, i) { return v - dn[i]; }) };
}

export function ichimoku(h, l) {
  function mid(n) { var hh = highest(h, n), ll = lowest(l, n); return hh.map(function (v, i) { return (v + ll[i]) / 2; }); }
  var tenkan = mid(9), kijun = mid(26), b52 = mid(52);
  var spanA = shift(tenkan.map(function (v, i) { return (v + kijun[i]) / 2; }), 26);
  var spanB = shift(b52, 26);
  return { tenkan: tenkan, kijun: kijun, spanA: spanA, spanB: spanB };
}

// pivots classiques calcules sur la seance precedente
export function pivots(h, l, c) {
  var p = nan(c.length), r1 = nan(c.length), s1 = nan(c.length);
  for (var i = 1; i < c.length; i++) {
    var pp = (h[i - 1] + l[i - 1] + c[i - 1]) / 3;
    p[i] = pp; r1[i] = 2 * pp - l[i - 1]; s1[i] = 2 * pp - h[i - 1];
  }
  return { p: p, r1: r1, s1: s1 };
}

export function fib618(h, l, n) {
  var hh = highest(h, n), ll = lowest(l, n);
  return hh.map(function (v, i) { return v - (v - ll[i]) * 0.618; });
}

export function zscore(close, n) {
  var m = sma(close, n), sd = stdev(close, n);
  return close.map(function (v, i) { return sd[i] ? (v - m[i]) / sd[i] : NaN; });
}

export function betaCorr(assetClose, indexClose) {
  var n = Math.min(assetClose.length, indexClose.length);
  var a = logReturns(assetClose.slice(-n)), b = logReturns(indexClose.slice(-n));
  var m = Math.min(a.length, b.length);
  a = a.slice(-m); b = b.slice(-m);
  if (m < 20) return { beta: NaN, corr: NaN };
  var ma = 0, mb = 0;
  for (var i = 0; i < m; i++) { ma += a[i]; mb += b[i]; }
  ma /= m; mb /= m;
  var cov = 0, va = 0, vb = 0;
  for (var k = 0; k < m; k++) { cov += (a[k] - ma) * (b[k] - mb); va += (a[k] - ma) * (a[k] - ma); vb += (b[k] - mb) * (b[k] - mb); }
  return { beta: vb === 0 ? NaN : cov / vb, corr: va * vb === 0 ? NaN : cov / Math.sqrt(va * vb) };
}

// Aligne l'indice de reference sur les dates du titre (places differentes = jours feries differents)
export function alignTo(times, ref) {
  if (!ref || !ref.time || !ref.close) return null;
  var map = {}, out = [], lastV = NaN;
  for (var i = 0; i < ref.time.length; i++) map[Math.floor(ref.time[i] / 86400)] = ref.close[i];
  var keys = Object.keys(map).map(Number).sort(function (a, b) { return a - b; }), p = 0;
  for (var j = 0; j < times.length; j++) {
    var d = Math.floor(times[j] / 86400);
    while (p < keys.length && keys[p] <= d) { lastV = map[keys[p]]; p++; }
    out.push(lastV);
  }
  return out;
}
