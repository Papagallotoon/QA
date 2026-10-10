// Calculs d'analyse technique - series de valeurs, pas de dependance externe.

export function last(a) { return a && a.length ? a[a.length - 1] : NaN; }

export function sma(src, n) {
  var out = [], sum = 0;
  for (var i = 0; i < src.length; i++) {
    sum += src[i];
    if (i >= n) sum -= src[i - n];
    out.push(i >= n - 1 ? sum / n : NaN);
  }
  return out;
}

export function ema(src, n) {
  var out = [], k = 2 / (n + 1), prev = NaN;
  for (var i = 0; i < src.length; i++) {
    if (isNaN(prev)) {
      if (i >= n - 1) {
        var s = 0;
        for (var j = i - n + 1; j <= i; j++) s += src[j];
        prev = s / n;
      }
      out.push(prev);
    } else {
      prev = src[i] * k + prev * (1 - k);
      out.push(prev);
    }
  }
  return out;
}

export function wma(src, n) {
  var out = [], denom = (n * (n + 1)) / 2;
  for (var i = 0; i < src.length; i++) {
    if (i < n - 1) { out.push(NaN); continue; }
    var s = 0;
    for (var j = 0; j < n; j++) s += src[i - n + 1 + j] * (j + 1);
    out.push(s / denom);
  }
  return out;
}

export function hma(src, n) {
  var half = wma(src, Math.round(n / 2));
  var full = wma(src, n);
  var diff = src.map(function (_, i) { return 2 * half[i] - full[i]; });
  return wma(diff, Math.round(Math.sqrt(n)));
}

export function stdev(src, n) {
  var out = [];
  for (var i = 0; i < src.length; i++) {
    if (i < n - 1) { out.push(NaN); continue; }
    var m = 0;
    for (var j = i - n + 1; j <= i; j++) m += src[j];
    m /= n;
    var v = 0;
    for (var k = i - n + 1; k <= i; k++) v += (src[k] - m) * (src[k] - m);
    out.push(Math.sqrt(v / n));
  }
  return out;
}

export function trueRange(h, l, c) {
  var out = [h[0] - l[0]];
  for (var i = 1; i < c.length; i++) {
    out.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
  }
  return out;
}

export function rma(src, n) {
  var out = [], prev = NaN;
  for (var i = 0; i < src.length; i++) {
    if (isNaN(prev)) {
      if (i >= n - 1) {
        var s = 0;
        for (var j = i - n + 1; j <= i; j++) s += src[j];
        prev = s / n;
      }
      out.push(prev);
    } else {
      prev = (prev * (n - 1) + src[i]) / n;
      out.push(prev);
    }
  }
  return out;
}

export function atr(h, l, c, n) { return rma(trueRange(h, l, c), n); }

export function rsi(close, n) {
  var gains = [0], losses = [0];
  for (var i = 1; i < close.length; i++) {
    var d = close[i] - close[i - 1];
    gains.push(d > 0 ? d : 0);
    losses.push(d < 0 ? -d : 0);
  }
  var ag = rma(gains, n), al = rma(losses, n);
  return close.map(function (_, i) {
    if (isNaN(ag[i]) || isNaN(al[i])) return NaN;
    if (al[i] === 0) return 100;
    var rs = ag[i] / al[i];
    return 100 - 100 / (1 + rs);
  });
}

export function macd(close) {
  var f = ema(close, 12), s = ema(close, 26);
  var line = close.map(function (_, i) { return f[i] - s[i]; });
  var sig = ema(line.map(function (v) { return isNaN(v) ? 0 : v; }), 9);
  return { line: line, signal: sig, hist: line.map(function (v, i) { return v - sig[i]; }) };
}

export function dmi(h, l, c, n) {
  var plus = [0], minus = [0];
  for (var i = 1; i < c.length; i++) {
    var up = h[i] - h[i - 1], dn = l[i - 1] - l[i];
    plus.push(up > dn && up > 0 ? up : 0);
    minus.push(dn > up && dn > 0 ? dn : 0);
  }
  var tr = rma(trueRange(h, l, c), n);
  var pdi = rma(plus, n).map(function (v, i) { return (100 * v) / tr[i]; });
  var mdi = rma(minus, n).map(function (v, i) { return (100 * v) / tr[i]; });
  var dx = pdi.map(function (v, i) {
    var sum = v + mdi[i];
    return sum === 0 ? 0 : (100 * Math.abs(v - mdi[i])) / sum;
  });
  return { pdi: pdi, mdi: mdi, adx: rma(dx, n) };
}

export function stoch(h, l, c, n, d) {
  var k = [];
  for (var i = 0; i < c.length; i++) {
    if (i < n - 1) { k.push(NaN); continue; }
    var hh = -Infinity, ll = Infinity;
    for (var j = i - n + 1; j <= i; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
    k.push(hh === ll ? 50 : ((c[i] - ll) / (hh - ll)) * 100);
  }
  return { k: k, d: sma(k.map(function (v) { return isNaN(v) ? 50 : v; }), d) };
}

export function stochRsi(close, n) {
  var r = rsi(close, n);
  var out = [];
  for (var i = 0; i < r.length; i++) {
    if (i < n * 2) { out.push(NaN); continue; }
    var hh = -Infinity, ll = Infinity;
    for (var j = i - n + 1; j <= i; j++) {
      if (isNaN(r[j])) continue;
      if (r[j] > hh) hh = r[j];
      if (r[j] < ll) ll = r[j];
    }
    out.push(hh === ll ? 50 : ((r[i] - ll) / (hh - ll)) * 100);
  }
  return out;
}

export function cci(h, l, c, n) {
  var tp = c.map(function (_, i) { return (h[i] + l[i] + c[i]) / 3; });
  var m = sma(tp, n);
  var out = [];
  for (var i = 0; i < tp.length; i++) {
    if (isNaN(m[i])) { out.push(NaN); continue; }
    var md = 0;
    for (var j = i - n + 1; j <= i; j++) md += Math.abs(tp[j] - m[i]);
    md /= n;
    out.push(md === 0 ? 0 : (tp[i] - m[i]) / (0.015 * md));
  }
  return out;
}

export function willr(h, l, c, n) {
  var out = [];
  for (var i = 0; i < c.length; i++) {
    if (i < n - 1) { out.push(NaN); continue; }
    var hh = -Infinity, ll = Infinity;
    for (var j = i - n + 1; j <= i; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
    out.push(hh === ll ? -50 : ((hh - c[i]) / (hh - ll)) * -100);
  }
  return out;
}

export function roc(close, n) {
  return close.map(function (v, i) { return i < n ? NaN : ((v - close[i - n]) / close[i - n]) * 100; });
}

export function mfi(h, l, c, v, n) {
  var tp = c.map(function (_, i) { return (h[i] + l[i] + c[i]) / 3; });
  var out = [NaN];
  for (var i = 1; i < c.length; i++) {
    if (i < n) { out.push(NaN); continue; }
    var pos = 0, neg = 0;
    for (var j = i - n + 1; j <= i; j++) {
      var flow = tp[j] * (v[j] || 0);
      if (tp[j] > tp[j - 1]) pos += flow; else if (tp[j] < tp[j - 1]) neg += flow;
    }
    out.push(neg === 0 ? 100 : 100 - 100 / (1 + pos / neg));
  }
  return out;
}

export function tsi(close) {
  var m = [0];
  for (var i = 1; i < close.length; i++) m.push(close[i] - close[i - 1]);
  var a = ema(ema(m, 25), 13);
  var b = ema(ema(m.map(Math.abs), 25), 13);
  return a.map(function (v, i) { return b[i] ? (100 * v) / b[i] : NaN; });
}

export function ultimate(h, l, c) {
  var bp = [NaN], tr = [NaN];
  for (var i = 1; i < c.length; i++) {
    var lo = Math.min(l[i], c[i - 1]);
    bp.push(c[i] - lo);
    tr.push(Math.max(h[i], c[i - 1]) - lo);
  }
  function avg(n, i) {
    var b = 0, t = 0;
    for (var j = i - n + 1; j <= i; j++) { b += bp[j]; t += tr[j]; }
    return t === 0 ? 0 : b / t;
  }
  return c.map(function (_, i) {
    if (i < 28) return NaN;
    return (100 * (4 * avg(7, i) + 2 * avg(14, i) + avg(28, i))) / 7;
  });
}

export function awesome(h, l) {
  var mid = h.map(function (_, i) { return (h[i] + l[i]) / 2; });
  var f = sma(mid, 5), s = sma(mid, 34);
  return mid.map(function (_, i) { return f[i] - s[i]; });
}

export function bollingerPctB(close, n, k) {
  var m = sma(close, n), sd = stdev(close, n);
  return close.map(function (v, i) {
    var up = m[i] + k * sd[i], dn = m[i] - k * sd[i];
    return up === dn ? 0.5 : (v - dn) / (up - dn);
  });
}

export function keltner(h, l, c, n, mult) {
  var mid = ema(c, n), a = atr(h, l, c, n);
  return { mid: mid, upper: mid.map(function (v, i) { return v + mult * a[i]; }), lower: mid.map(function (v, i) { return v - mult * a[i]; }) };
}

export function choppiness(h, l, c, n) {
  var tr = trueRange(h, l, c);
  var out = [];
  for (var i = 0; i < c.length; i++) {
    if (i < n) { out.push(NaN); continue; }
    var sum = 0, hh = -Infinity, ll = Infinity;
    for (var j = i - n + 1; j <= i; j++) { sum += tr[j]; if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
    var rng = hh - ll;
    out.push(rng <= 0 ? 50 : (100 * Math.log10(sum / rng)) / Math.log10(n));
  }
  return out;
}

export function logReturns(close) {
  var out = [];
  for (var i = 1; i < close.length; i++) out.push(Math.log(close[i] / close[i - 1]));
  return out;
}

export function histVol(close, n) {
  var r = logReturns(close);
  if (r.length < n) return NaN;
  var slice = r.slice(-n);
  var m = slice.reduce(function (a, b) { return a + b; }, 0) / n;
  var v = slice.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (n - 1);
  return Math.sqrt(v) * Math.sqrt(252) * 100;
}

export function donchian(h, l, n) {
  var i = h.length - 1, hh = -Infinity, ll = Infinity;
  for (var j = i - n + 1; j <= i; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
  return { upper: hh, lower: ll, mid: (hh + ll) / 2 };
}

export function obv(c, v) {
  var out = [0];
  for (var i = 1; i < c.length; i++) {
    out.push(out[i - 1] + (c[i] > c[i - 1] ? (v[i] || 0) : c[i] < c[i - 1] ? -(v[i] || 0) : 0));
  }
  return out;
}

export function moneyFlowMult(h, l, c) {
  return c.map(function (_, i) {
    var rng = h[i] - l[i];
    return rng === 0 ? 0 : ((c[i] - l[i]) - (h[i] - c[i])) / rng;
  });
}

export function adLine(h, l, c, v) {
  var mf = moneyFlowMult(h, l, c), out = [], acc = 0;
  for (var i = 0; i < c.length; i++) { acc += mf[i] * (v[i] || 0); out.push(acc); }
  return out;
}

export function cmf(h, l, c, v, n) {
  var mf = moneyFlowMult(h, l, c);
  var i = c.length - 1, num = 0, den = 0;
  for (var j = i - n + 1; j <= i; j++) { num += mf[j] * (v[j] || 0); den += v[j] || 0; }
  return den === 0 ? 0 : num / den;
}

export function vwap(h, l, c, v, n) {
  var i = c.length - 1, pv = 0, vol = 0;
  for (var j = i - n + 1; j <= i; j++) {
    var tp = (h[j] + l[j] + c[j]) / 3;
    pv += tp * (v[j] || 0); vol += v[j] || 0;
  }
  return vol === 0 ? c[i] : pv / vol;
}

export function forceIndex(c, v, n) {
  var f = [0];
  for (var i = 1; i < c.length; i++) f.push((c[i] - c[i - 1]) * (v[i] || 0));
  return ema(f, n);
}

export function eom(h, l, v, n) {
  var e = [0];
  for (var i = 1; i < h.length; i++) {
    var mid = (h[i] + l[i]) / 2 - (h[i - 1] + l[i - 1]) / 2;
    var box = (v[i] || 1) / 1e8 / Math.max(h[i] - l[i], 1e-9);
    e.push(box === 0 ? 0 : mid / box);
  }
  return sma(e, n);
}

export function relVolume(v, n) {
  var i = v.length - 1, s = 0;
  for (var j = i - n; j < i; j++) s += v[j] || 0;
  var avg = s / n;
  return avg === 0 ? 1 : (v[i] || 0) / avg;
}

export function klinger(h, l, c, v) {
  var vf = [0];
  for (var i = 1; i < c.length; i++) {
    var trend = (h[i] + l[i] + c[i]) > (h[i - 1] + l[i - 1] + c[i - 1]) ? 1 : -1;
    vf.push((v[i] || 0) * trend);
  }
  var f = ema(vf, 34), s = ema(vf, 55);
  return f.map(function (x, i) { return (x - s[i]) / 1e6; });
}

export function pivots(h, l, c) {
  var i = c.length - 2;
  var p = (h[i] + l[i] + c[i]) / 3;
  return { p: p, r1: 2 * p - l[i], s1: 2 * p - h[i] };
}

export function fib618(h, l, n) {
  var i = h.length - 1, hh = -Infinity, ll = Infinity;
  for (var j = i - n + 1; j <= i; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
  return hh - (hh - ll) * 0.618;
}

export function betaCorr(assetClose, indexClose) {
  var n = Math.min(assetClose.length, indexClose.length);
  var a = logReturns(assetClose.slice(-n)), b = logReturns(indexClose.slice(-n));
  var m = Math.min(a.length, b.length);
  a = a.slice(-m); b = b.slice(-m);
  if (m < 20) return { beta: NaN, corr: NaN };
  var ma = a.reduce(function (x, y) { return x + y; }, 0) / m;
  var mb = b.reduce(function (x, y) { return x + y; }, 0) / m;
  var cov = 0, va = 0, vb = 0;
  for (var i = 0; i < m; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) * (a[i] - ma);
    vb += (b[i] - mb) * (b[i] - mb);
  }
  return { beta: vb === 0 ? NaN : cov / vb, corr: va * vb === 0 ? NaN : cov / Math.sqrt(va * vb) };
}

export function ichimoku(h, l) {
  function mid(n) {
    var i = h.length - 1, hh = -Infinity, ll = Infinity;
    for (var j = i - n + 1; j <= i; j++) { if (h[j] > hh) hh = h[j]; if (l[j] < ll) ll = l[j]; }
    return (hh + ll) / 2;
  }
  var tenkan = mid(9), kijun = mid(26);
  return { tenkan: tenkan, kijun: kijun, base: (tenkan + kijun) / 2 };
}

export function psar(h, l) {
  var af = 0.02, maxAf = 0.2, step = 0.02;
  var up = true, sar = l[0], ep = h[0], a = af;
  for (var i = 1; i < h.length; i++) {
    sar = sar + a * (ep - sar);
    if (up) {
      if (l[i] < sar) { up = false; sar = ep; ep = l[i]; a = af; }
      else if (h[i] > ep) { ep = h[i]; a = Math.min(a + step, maxAf); }
    } else {
      if (h[i] > sar) { up = true; sar = ep; ep = h[i]; a = af; }
      else if (l[i] < ep) { ep = l[i]; a = Math.min(a + step, maxAf); }
    }
  }
  return sar;
}

export function supertrend(h, l, c, n, mult) {
  var a = atr(h, l, c, n);
  var upper = [], lower = [], dir = [], st = [];
  for (var i = 0; i < c.length; i++) {
    var mid = (h[i] + l[i]) / 2;
    var bu = mid + mult * a[i], bl = mid - mult * a[i];
    if (i === 0 || isNaN(a[i])) { upper.push(bu); lower.push(bl); dir.push(1); st.push(bl); continue; }
    upper.push(bu < upper[i - 1] || c[i - 1] > upper[i - 1] ? bu : upper[i - 1]);
    lower.push(bl > lower[i - 1] || c[i - 1] < lower[i - 1] ? bl : lower[i - 1]);
    var d = c[i] > upper[i - 1] ? 1 : c[i] < lower[i - 1] ? -1 : dir[i - 1];
    dir.push(d);
    st.push(d > 0 ? lower[i] : upper[i]);
  }
  return last(st);
}

export function aroonOsc(h, l, n) {
  var i = h.length - 1, hi = 0, li = 0, hh = -Infinity, ll = Infinity;
  for (var j = i - n; j <= i; j++) {
    if (h[j] >= hh) { hh = h[j]; hi = j; }
    if (l[j] <= ll) { ll = l[j]; li = j; }
  }
  var upA = ((n - (i - hi)) / n) * 100;
  var dnA = ((n - (i - li)) / n) * 100;
  return upA - dnA;
}
