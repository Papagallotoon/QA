// Monte-Carlo : trajectoires quotidiennes a queues epaisses (Student t, 4 ddl,
// renormalisee a variance 1) - les krachs et envolees sont plus frequents
// qu'avec une loi normale, ce qui rend les intervalles plus honnetes.

function gauss() {
  var u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
var DF = 4, T_SCALE = Math.sqrt((DF - 2) / DF);
function studentT() {
  var z = gauss(), chi = 0;
  for (var i = 0; i < DF; i++) { var g = gauss(); chi += g * g; }
  return (z / Math.sqrt(chi / DF)) * T_SCALE;
}

/**
 * @param price  cours de depart
 * @param sigma  volatilite quotidienne (log)
 * @param muLog  rendement log attendu sur tout l'horizon
 * @param days   horizon en seances
 * @param n      nombre de scenarios
 * @param opts   { stop, target } facultatifs : probabilite de toucher l'un avant l'autre
 */
export function simulate(price, sigma, muLog, days, n, opts) {
  var paths = Math.max(500, n || 10000);
  var d = Math.max(1, days || 5);
  var sig = sigma > 0 ? sigma : 0.015;
  var stepMu = (muLog || 0) / d - 0.5 * sig * sig;
  var stop = opts && opts.stop, target = opts && opts.target;
  // pour limiter le cout sur 50 000 scenarios x 63 jours, on regroupe les pas
  var stepsPerPath = stop || target ? d : Math.min(d, 8);
  var dt = d / stepsPerPath, sdt = Math.sqrt(dt);

  var ends = new Float64Array(paths), above = 0, hitT = 0, hitS = 0;
  for (var p = 0; p < paths; p++) {
    var lp = 0, done = false;
    for (var s = 0; s < stepsPerPath; s++) {
      lp += stepMu * dt + sig * sdt * studentT();
      if (!done && (stop || target)) {
        var px = price * Math.exp(lp);
        if (stop && px <= stop) { hitS++; done = true; }
        else if (target && px >= target) { hitT++; done = true; }
      }
    }
    ends[p] = price * Math.exp(lp);
    if (ends[p] > price) above++;
  }
  var sorted = Array.prototype.slice.call(ends).sort(function (a, b) { return a - b; });
  function q(x) { return sorted[Math.min(sorted.length - 1, Math.floor(x * sorted.length))]; }
  function rel(v) { return ((v - price) / price) * 100; }
  var res = {
    scenarios: paths,
    probUp: (above / paths) * 100,
    median: q(0.5), medianPct: rel(q(0.5)),
    p05: q(0.05), p05Pct: rel(q(0.05)),
    p20: q(0.2), p80: q(0.8), p80Pct: rel(q(0.8)),
    p95: q(0.95), p95Pct: rel(q(0.95)),
  };
  if (stop || target) {
    res.pTarget = hitT / paths;
    res.pStop = hitS / paths;
    res.pNone = 1 - res.pTarget - res.pStop;
  }
  return res;
}
