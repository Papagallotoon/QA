import * as ta from "./ta";

export const CATS = ["Tous", "Tendance", "Momentum", "Volatilite", "Volume", "Structure"];

function fr(v, dec) {
  if (v == null || isNaN(v)) return "-";
  return v.toFixed(dec).replace(".", ",");
}

function maSig(value, price) {
  if (isNaN(value)) return null;
  var d = (value - price) / price;
  return d < -0.003 ? 1 : d > 0.003 ? -1 : 0;
}

function zeroSig(v, band) {
  if (isNaN(v)) return null;
  return v > band ? 1 : v < -band ? -1 : 0;
}

function thresholdSig(v, hi, lo) {
  if (isNaN(v)) return null;
  return v > hi ? -1 : v < lo ? 1 : 0;
}

/**
 * Calcule les 43 indicateurs a partir des chandeliers reels.
 * @param c   { open, high, low, close, volume } du titre
 * @param idx chandeliers de l'indice de reference (pour beta / correlation / force relative)
 * @param cur code devise, pour l'affichage
 */
export function buildIndicators(c, idx, cur) {
  var H = c.high, L = c.low, C = c.close, V = c.volume;
  var price = C[C.length - 1];
  var P = function (v) { return fr(v, 2) + (cur ? " " + cur : ""); };
  var rows = [];

  function push(name, cat, val, sig) { rows.push({ name: name, cat: cat, val: val, sig: sig }); }

  // --- Tendance ---
  var sma20 = ta.last(ta.sma(C, 20));
  var sma50 = ta.last(ta.sma(C, 50));
  var sma200 = ta.last(ta.sma(C, 200));
  var ema12 = ta.last(ta.ema(C, 12));
  var ema26 = ta.last(ta.ema(C, 26));
  push("SMA 20", "Tendance", P(sma20), maSig(sma20, price));
  push("SMA 50", "Tendance", P(sma50), maSig(sma50, price));
  push("SMA 200", "Tendance", P(sma200), maSig(sma200, price));
  push("EMA 12", "Tendance", P(ema12), maSig(ema12, price));
  push("EMA 26", "Tendance", P(ema26), maSig(ema26, price));

  var m = ta.macd(C);
  var macdHist = ta.last(m.hist);
  push("MACD (12,26,9)", "Tendance", fr(ta.last(m.line), 2), zeroSig(macdHist, 0));

  var d = ta.dmi(H, L, C, 14);
  push("ADX (14)", "Tendance", fr(ta.last(d.adx), 1), null);

  var ich = ta.ichimoku(H, L);
  push("Ichimoku (9,26)", "Tendance", P(ich.base), maSig(ich.base, price));

  var sar = ta.psar(H, L);
  push("SAR parabolique", "Tendance", P(sar), maSig(sar, price));

  var stv = ta.supertrend(H, L, C, 10, 3);
  push("SuperTrend (10,3)", "Tendance", P(stv), maSig(stv, price));

  var aro = ta.aroonOsc(H, L, 25);
  push("Aroon Oscillator (25)", "Tendance", fr(aro, 0), zeroSig(aro, 10));

  var hma21 = ta.last(ta.hma(C, 21));
  push("HMA 21", "Tendance", P(hma21), maSig(hma21, price));

  // --- Momentum ---
  var r14 = ta.last(ta.rsi(C, 14));
  push("RSI (14)", "Momentum", fr(r14, 1), thresholdSig(r14, 70, 30));

  var s = ta.stoch(H, L, C, 14, 3);
  var sk = ta.last(s.k);
  push("Stochastique %K", "Momentum", fr(sk, 1), thresholdSig(sk, 80, 20));

  var srsi = ta.last(ta.stochRsi(C, 14));
  push("Stochastique RSI", "Momentum", fr(srsi, 1), thresholdSig(srsi, 80, 20));

  var cciV = ta.last(ta.cci(H, L, C, 20));
  push("CCI (20)", "Momentum", fr(cciV, 0), isNaN(cciV) ? null : cciV > 100 ? 1 : cciV < -100 ? -1 : 0);

  var wr = ta.last(ta.willr(H, L, C, 14));
  push("Williams %R", "Momentum", fr(wr, 1), isNaN(wr) ? null : wr > -20 ? -1 : wr < -80 ? 1 : 0);

  var rocV = ta.last(ta.roc(C, 12));
  push("ROC (12)", "Momentum", fr(rocV, 2) + " %", zeroSig(rocV, 0.3));

  var mfiV = ta.last(ta.mfi(H, L, C, V, 14));
  push("MFI (14)", "Momentum", fr(mfiV, 1), thresholdSig(mfiV, 80, 20));

  var tsiV = ta.last(ta.tsi(C));
  push("TSI", "Momentum", fr(tsiV, 1), zeroSig(tsiV, 2));

  var uo = ta.last(ta.ultimate(H, L, C));
  push("Ultimate Oscillator", "Momentum", fr(uo, 1), thresholdSig(uo, 70, 30));

  var aoV = ta.last(ta.awesome(H, L));
  push("Awesome Oscillator", "Momentum", fr(aoV, 2), zeroSig(aoV, Math.abs(price) * 0.0008));

  var spread = ta.last(d.pdi) - ta.last(d.mdi);
  push("DMI (+DI - -DI)", "Momentum", fr(spread, 1), zeroSig(spread, 2));

  // --- Volatilite ---
  var pctb = ta.last(ta.bollingerPctB(C, 20, 2));
  push("Bandes de Bollinger %B", "Volatilite", fr(pctb, 2), thresholdSig(pctb, 0.8, 0.2));

  push("ATR (14)", "Volatilite", fr(ta.last(ta.atr(H, L, C, 14)), 2), null);

  var kc = ta.keltner(H, L, C, 20, 2);
  push("Canaux de Keltner", "Volatilite", P(ta.last(kc.mid)), null);

  push("Ecart-type (20)", "Volatilite", fr(ta.last(ta.stdev(C, 20)), 2), null);
  push("Choppiness Index", "Volatilite", fr(ta.last(ta.choppiness(H, L, C, 14)), 1), null);
  push("Volatilite historique 30 j", "Volatilite", fr(ta.histVol(C, 30), 1) + " %", null);

  var don = ta.donchian(H, L, 20);
  push("Canaux de Donchian", "Volatilite", P(don.mid), null);

  // --- Volume ---
  var obvSeries = ta.obv(C, V);
  var obvSlope = ta.last(obvSeries) - obvSeries[Math.max(0, obvSeries.length - 11)];
  push("OBV", "Volume", fr(ta.last(obvSeries) / 1e6, 2) + " M", zeroSig(obvSlope, 1));

  var cmfV = ta.cmf(H, L, C, V, 20);
  push("Chaikin Money Flow", "Volume", fr(cmfV, 2), zeroSig(cmfV, 0.03));

  var ad = ta.adLine(H, L, C, V);
  var adSlope = ta.last(ad) - ad[Math.max(0, ad.length - 11)];
  push("Accumulation / Distribution", "Volume", fr(ta.last(ad) / 1e6, 2) + " M", zeroSig(adSlope, 1));

  var vw = ta.vwap(H, L, C, V, 20);
  push("VWAP", "Volume", P(vw), maSig(vw, price));

  var fi = ta.last(ta.forceIndex(C, V, 13));
  push("Force Index", "Volume", fr(fi / 1e6, 2) + " M", zeroSig(fi, 1));

  var eomV = ta.last(ta.eom(H, L, V, 14));
  push("Ease of Movement", "Volume", fr(eomV, 2), zeroSig(eomV, 0.05));

  push("Volume relatif 20 j", "Volume", fr(ta.relVolume(V, 20), 2) + " x", null);

  var kl = ta.last(ta.klinger(H, L, C, V));
  push("Oscillateur de Klinger", "Volume", fr(kl, 0), zeroSig(kl, 0.5));

  // --- Structure ---
  var pv = ta.pivots(H, L, C);
  push("Points pivots (P)", "Structure", P(pv.p), maSig(pv.p, price));

  var fib = ta.fib618(H, L, 60);
  push("Retracement Fibonacci 61,8 %", "Structure", P(fib), maSig(fib, price));

  var bc = idx && idx.close ? ta.betaCorr(C, idx.close) : { beta: NaN, corr: NaN };
  push("Beta 1 an", "Structure", fr(bc.beta, 2), null);
  push("Correlation a l'indice", "Structure", fr(bc.corr, 2), null);

  var rs = NaN;
  if (idx && idx.close && idx.close.length > 21) {
    var a = (C[C.length - 1] / C[C.length - 22] - 1) * 100;
    var b = (idx.close[idx.close.length - 1] / idx.close[idx.close.length - 22] - 1) * 100;
    rs = a - b;
  }
  push("Force relative vs indice", "Structure", fr(rs, 1) + " %", zeroSig(rs, 0.5));

  return rows;
}

export function consensus(rows) {
  var dirs = rows.filter(function (i) { return i.sig !== null && i.sig !== undefined; });
  var buy = dirs.filter(function (i) { return i.sig > 0; }).length;
  var sell = dirs.filter(function (i) { return i.sig < 0; }).length;
  var neu = dirs.length - buy - sell;
  var net = dirs.length ? (buy - sell) / dirs.length : 0;
  var verdict = net > 0.35 ? "ACHAT FORT" : net > 0.12 ? "ACHAT" : net < -0.35 ? "VENTE FORTE" : net < -0.12 ? "VENTE" : "NEUTRE";
  return {
    buy: buy, sell: sell, neu: neu, net: net, verdict: verdict,
    directional: dirs.length, info: rows.length - dirs.length,
  };
}

// Score par famille, entre -100 et +100. Alimente la carte "detail du calcul".
export function familyScores(rows) {
  var fams = ["Tendance", "Momentum", "Volume", "Structure"];
  return fams.map(function (f) {
    var sub = rows.filter(function (r) { return r.cat === f && r.sig !== null; });
    if (!sub.length) return [f, 0];
    var net = sub.reduce(function (a, r) { return a + r.sig; }, 0) / sub.length;
    return [f, Math.round(net * 100)];
  });
}
