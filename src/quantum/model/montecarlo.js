// Monte-Carlo simple : marche aleatoire log-normale.
// La derive vient du consensus des indicateurs techniques, la volatilite de l'historique.

function gauss() {
  var u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const HORIZON_DAYS = { "1J": 1, "1S": 5, "1M": 21 };

/**
 * @param price      cours actuel
 * @param sigmaDaily ecart-type quotidien des rendements log
 * @param net        consensus des indicateurs, entre -1 et 1
 * @param days       horizon en seances
 * @param n          nombre de scenarios
 */
export function simulate(price, sigmaDaily, net, days, n) {
  var paths = n || 10000;
  // derive : au plus 0,35 ecart-type par seance, dans le sens du consensus
  var mu = net * 0.35 * sigmaDaily;
  var t = days;
  var drift = (mu - 0.5 * sigmaDaily * sigmaDaily) * t;
  var vol = sigmaDaily * Math.sqrt(t);

  var results = new Float64Array(paths);
  var above = 0;
  for (var i = 0; i < paths; i++) {
    var end = price * Math.exp(drift + vol * gauss());
    results[i] = end;
    if (end > price) above++;
  }

  var sorted = Array.prototype.slice.call(results).sort(function (a, b) { return a - b; });
  function pct(p) { return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]; }

  var median = pct(0.5);
  var p05 = pct(0.05);
  var p95 = pct(0.95);
  var probUp = (above / paths) * 100;

  return {
    probUp: probUp,
    probDown: 100 - probUp,
    median: median,
    medianPct: ((median - price) / price) * 100,
    p05: p05,
    p05Pct: ((p05 - price) / price) * 100,
    p95: p95,
    p95Pct: ((p95 - price) / price) * 100,
    scenarios: paths,
  };
}
