export const CATS = ["Tous", "Tendance", "Momentum", "Volatilite", "Volume", "Structure"];

// [nom, categorie, type, min, max, decimales, suffixe, regle]
// regles : ma = compare au cours / sar = idem / zero = signe / o70 o80 = seuils
//          cci = +-100 / wr = Williams / pctb = %B Bollinger / info = non directionnel
export const IND = [
  ["SMA 20", "Tendance", "p", 0.96, 1.03, 2, "", "ma"],
  ["SMA 50", "Tendance", "p", 0.93, 1.05, 2, "", "ma"],
  ["SMA 200", "Tendance", "p", 0.84, 1.08, 2, "", "ma"],
  ["EMA 12", "Tendance", "p", 0.98, 1.02, 2, "", "ma"],
  ["EMA 26", "Tendance", "p", 0.965, 1.03, 2, "", "ma"],
  ["MACD (12,26,9)", "Tendance", "n", -4.4, 5.2, 2, "", "zero"],
  ["ADX (14)", "Tendance", "n", 12, 46, 1, "", "info"],
  ["Ichimoku (9,26)", "Tendance", "p", 0.95, 1.05, 2, "", "ma"],
  ["SAR parabolique", "Tendance", "p", 0.93, 1.07, 2, "", "ma"],
  ["SuperTrend (10,3)", "Tendance", "p", 0.92, 1.07, 2, "", "ma"],
  ["Aroon Oscillator (25)", "Tendance", "n", -92, 96, 0, "", "zero"],
  ["HMA 21", "Tendance", "p", 0.975, 1.025, 2, "", "ma"],

  ["RSI (14)", "Momentum", "n", 21, 83, 1, "", "o70"],
  ["Stochastique %K", "Momentum", "n", 5, 96, 1, "", "o80"],
  ["Stochastique RSI", "Momentum", "n", 2, 98, 1, "", "o80"],
  ["CCI (20)", "Momentum", "n", -215, 235, 0, "", "cci"],
  ["Williams %R", "Momentum", "n", -96, -4, 1, "", "wr"],
  ["ROC (12)", "Momentum", "n", -7.4, 8.6, 2, " %", "zero"],
  ["MFI (14)", "Momentum", "n", 14, 89, 1, "", "o80"],
  ["TSI", "Momentum", "n", -34, 36, 1, "", "zero"],
  ["Ultimate Oscillator", "Momentum", "n", 23, 79, 1, "", "o70"],
  ["Awesome Oscillator", "Momentum", "n", -9.4, 11.2, 2, "", "zero"],
  ["DMI (+DI - -DI)", "Momentum", "n", -23, 26, 1, "", "zero"],

  ["Bandes de Bollinger %B", "Volatilite", "n", -0.06, 1.12, 2, "", "pctb"],
  ["ATR (14)", "Volatilite", "n", 0.6, 4.2, 2, "", "info"],
  ["Canaux de Keltner", "Volatilite", "p", 0.96, 1.04, 2, "", "info"],
  ["Ecart-type (20)", "Volatilite", "n", 0.4, 3.6, 2, "", "info"],
  ["Choppiness Index", "Volatilite", "n", 24, 72, 1, "", "info"],
  ["Volatilite historique 30 j", "Volatilite", "n", 9, 42, 1, " %", "info"],
  ["Canaux de Donchian", "Volatilite", "p", 0.93, 1.06, 2, "", "info"],

  ["OBV", "Volume", "n", -4.6, 6.4, 2, " M", "zero"],
  ["Chaikin Money Flow", "Volume", "n", -0.34, 0.36, 2, "", "zero"],
  ["Accumulation / Distribution", "Volume", "n", -3.4, 5.0, 2, " M", "zero"],
  ["VWAP", "Volume", "p", 0.982, 1.018, 2, "", "ma"],
  ["Force Index", "Volume", "n", -2.8, 3.4, 2, " M", "zero"],
  ["Ease of Movement", "Volume", "n", -1.9, 2.3, 2, "", "zero"],
  ["Volume relatif 20 j", "Volume", "n", 0.5, 2.4, 2, " x", "info"],
  ["Oscillateur de Klinger", "Volume", "n", -880, 920, 0, "", "zero"],

  ["Points pivots (P)", "Structure", "p", 0.985, 1.015, 2, "", "ma"],
  ["Retracement Fibonacci 61,8 %", "Structure", "p", 0.94, 1.03, 2, "", "ma"],
  ["Beta 1 an", "Structure", "n", 0.55, 1.5, 2, "", "info"],
  ["Correlation a l'indice", "Structure", "n", 0.28, 0.92, 2, "", "info"],
  ["Force relative vs indice", "Structure", "n", -8.4, 10.6, 1, " %", "zero"],
];

// +1 : valeur haute = haussier / -1 : valeur basse = haussier
const BULL_DIR = { ma: -1, sar: -1, zero: 1, o70: -1, o80: -1, cci: 1, wr: -1, pctb: -1, info: 0 };

export function h01(s) {
  var x = 2166136261;
  for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return ((x >>> 0) % 100000) / 100000;
}

function frNum(v, dec) { return v.toFixed(dec).replace(".", ","); }

function sigOf(rule, raw, price, lo, hi) {
  if (rule === "info") return null;
  if (rule === "ma" || rule === "sar") {
    var d = (raw - price) / price;
    return d < -0.003 ? 1 : d > 0.003 ? -1 : 0;
  }
  if (rule === "o70") return raw > 70 ? -1 : raw < 30 ? 1 : 0;
  if (rule === "o80") return raw > 80 ? -1 : raw < 20 ? 1 : 0;
  if (rule === "cci") return raw > 100 ? 1 : raw < -100 ? -1 : 0;
  if (rule === "wr") return raw > -20 ? -1 : raw < -80 ? 1 : 0;
  if (rule === "pctb") return raw > 0.8 ? -1 : raw < 0.2 ? 1 : 0;
  var band = (hi - lo) * 0.05;
  return raw > band ? 1 : raw < -band ? -1 : 0;
}

export function priceOf(stock) {
  return parseFloat(String(stock.price).replace(/[^0-9,]/g, "").replace(",", "."));
}

export function currencyOf(stock) {
  var m = String(stock.price).match(/[A-Z]{3}$/);
  return m ? m[0] : "";
}

export function techFor(stock) {
  var dir = stock.dir || 1;
  var bias = dir > 0 ? (stock.score - 50) / 50 : -(stock.score - 50) / 50;
  var num = priceOf(stock);
  var cur = currencyOf(stock);
  return IND.map(function (spec) {
    var name = spec[0], cat = spec[1], kind = spec[2], rule = spec[7];
    var r = h01(stock.id + "|" + name);
    var target = 0.5 + bias * 0.5 * BULL_DIR[rule];
    var rs = Math.max(0.02, Math.min(0.98, r * 0.4 + target * 0.6));
    var lo = spec[3], hi = spec[4];
    var raw = kind === "p" ? num * (lo + rs * (hi - lo)) : lo + rs * (hi - lo);
    var val = kind === "p" ? frNum(raw, spec[5]) + " " + cur : frNum(raw, spec[5]) + spec[6];
    var sig = sigOf(rule, raw, num, kind === "p" ? num * lo : lo, kind === "p" ? num * hi : hi);
    return { name: name, cat: cat, val: val, sig: sig, rule: rule };
  });
}

export function consensus(rows) {
  var dirs = rows.filter(function (i) { return i.sig !== null; });
  var buy = dirs.filter(function (i) { return i.sig > 0; }).length;
  var sell = dirs.filter(function (i) { return i.sig < 0; }).length;
  var neu = dirs.length - buy - sell;
  var net = (buy - sell) / dirs.length;
  var verdict = net > 0.35 ? "ACHAT FORT" : net > 0.12 ? "ACHAT" : net < -0.35 ? "VENTE FORTE" : net < -0.12 ? "VENTE" : "NEUTRE";
  return {
    buy: buy, sell: sell, neu: neu, net: net, verdict: verdict,
    directional: dirs.length, info: rows.length - dirs.length,
  };
}
