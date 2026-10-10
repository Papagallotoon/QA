// Donnees synthetiques pour tester toute la chaine sans acces a Yahoo.
// Marche aleatoire avec un peu de "momentum" cache : le modele doit le trouver.

function rng(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function fakeSeries(seed, n = 760, endTs = Math.floor(Date.now() / 1000)) {
  const r = rng(seed), g = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  const o = [], h = [], l = [], c = [], v = [], t = [];
  let p = 50 + r() * 200, mom = 0;
  // dates de seance (jours ouvres) se terminant aujourd'hui
  const days = [];
  let d = new Date(endTs * 1000); d.setUTCHours(16, 0, 0, 0);
  while (days.length < n) { const w = d.getUTCDay(); if (w !== 0 && w !== 6) days.unshift(Math.floor(d.getTime() / 1000)); d.setUTCDate(d.getUTCDate() - 1); }
  for (let i = 0; i < n; i++) {
    const ret = 0.0002 + 0.1 * mom + 0.016 * g();
    mom = 0.95 * mom + 0.05 * ret;
    const op = p; p *= Math.exp(ret);
    o.push(op); c.push(p);
    h.push(Math.max(op, p) * (1 + Math.abs(g()) * 0.006));
    l.push(Math.min(op, p) * (1 - Math.abs(g()) * 0.006));
    v.push(Math.round(1e6 * (1 + Math.abs(g()))));
    t.push(days[i]);
  }
  return { open: o, high: h, low: l, close: c, volume: v, time: t };
}

export function fakeUniverse(symbols) {
  const out = {};
  // FAKE_CUT=n : retire les n dernieres seances (simule "il y a n jours" pour tester le bilan)
  const cut = Number(process.env.FAKE_CUT || 0);
  symbols.forEach((s, k) => {
    const f = fakeSeries(k * 97 + 13);
    if (cut > 0) for (const key of Object.keys(f)) f[key] = f[key].slice(0, f[key].length - cut);
    out[s] = { ...f, symbol: s, name: s, currency: s.endsWith(".PA") ? "EUR" : "USD" };
  });
  return out;
}
