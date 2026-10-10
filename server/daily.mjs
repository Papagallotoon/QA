#!/usr/bin/env node
// Quantum Algo - tache quotidienne.
//  1. telecharge 3 ans d'historique pour tout l'univers suivi
//  2. verifie les previsions passees arrivees a echeance (bilan reel)
//  3. re-entraine le modele et ne le remplace que s'il fait mieux (champion/challenger)
//  4. calcule les signaux et plans du jour, les enregistre pour verification future
//  5. envoie la newsletter (e-mail / WhatsApp)
// Options : --fake (donnees synthetiques, pour tester sans reseau)  --no-send  --force-send

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as ta from "../src/quantum/core/ta.js";
import { computeAll, directionalIds } from "../src/quantum/core/signals.js";
import { HORIZONS, HORIZON_KEYS, DEFAULT_MODEL, sigmaAt } from "../src/quantum/core/model.js";
import { evaluateAll, buildPlan, bestHorizon } from "../src/quantum/core/plan.js";
import { trainAll } from "../src/quantum/core/learn.js";
import { INDEX_DEFS, COMPONENTS, NEWS_NAMES, INDEX_QUERY } from "../src/quantum/core/universe.js";
import { fetchMany, fetchHeadlines } from "./lib/fetch.mjs";
import { buildLetter } from "./lib/letter.mjs";
import { sendAll, channelsConfigured } from "./lib/send.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "out");
const args = new Set(process.argv.slice(2));
const FAKE = args.has("--fake");
const NO_SEND = args.has("--no-send") || process.env.DRY_RUN === "1";
const FORCE_SEND = args.has("--force-send");
fs.mkdirSync(OUT, { recursive: true });

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); } catch { return d; } };
const writeJson = (f, o, compact) => fs.writeFileSync(path.join(OUT, f), JSON.stringify(o, null, compact ? 0 : 1));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const config = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));
const MIN_CONF = 0.03;   // une prevision "avec avis" s'ecarte d'au moins 3 points de 50 %

// ---------------------------------------------------------------------------
// 1. Donnees
// ---------------------------------------------------------------------------
const indexOf = {};       // titre -> symbole de son indice
for (const def of INDEX_DEFS) for (const s of COMPONENTS[def.id] || []) if (!indexOf[s]) indexOf[s] = def.symbol;
for (const s of config.extraSymbols || []) if (!indexOf[s]) indexOf[s] = config.extraIndex?.[s] || "^GSPC";
const stocks = Object.keys(indexOf);
const indexSyms = [...new Set(INDEX_DEFS.map((d) => d.symbol))];
const allSyms = [...new Set([...indexSyms, ...stocks])];

log(`univers : ${stocks.length} valeurs, ${indexSyms.length} indices${FAKE ? " (donnees synthetiques)" : ""}`);
let data, failed;
if (FAKE) {
  const { fakeUniverse } = await import("./lib/fake.mjs");
  data = fakeUniverse(allSyms); failed = {};
} else {
  const r = await fetchMany(allSyms, 4);
  data = r.ok; failed = r.failed;
}
log(`telecharge : ${Object.keys(data).length}, echecs : ${Object.keys(failed).length}`, Object.keys(failed).slice(0, 8).join(" "));
if (Object.keys(data).length < 10) { console.error("Trop peu de donnees, arret sans rien modifier."); process.exit(1); }

const names = {};
for (const s of allSyms) names[s] = NEWS_NAMES[s] || data[s]?.name || s;
for (const d of INDEX_DEFS) names[d.symbol] = d.label;

// indicateurs (avec force relative vs l'indice de reference)
const items = [];
const bySym = {};
for (const s of stocks) {
  const c = data[s];
  if (!c || c.close.length < 260) continue;
  const ref = data[indexOf[s]];
  const all = computeAll(c, ref ? ta.alignTo(c.time, ref) : null);
  const it = { sym: s, all, close: c.close, time: c.time, c };
  items.push(it); bySym[s] = it;
}
for (const s of indexSyms) {
  const c = data[s];
  if (!c || c.close.length < 260) continue;
  bySym[s] = { sym: s, all: computeAll(c, null), close: c.close, time: c.time, c, isIndex: true };
}
log(`indicateurs calcules pour ${items.length} valeurs`);

// ---------------------------------------------------------------------------
// 2. Verification des previsions passees
// ---------------------------------------------------------------------------
const journal = readJson("journal.json", { pending: [], stats: {}, picks: [], since: null, changes: [], bench: {} });
journal.stats ||= {}; journal.picks ||= []; journal.changes ||= []; journal.bench ||= {};
const stillPending = [];
let resolved = 0;
for (const e of journal.pending) {
  const it = bySym[e.sym];
  if (!it) { stillPending.push(e); continue; }
  const k = it.time.indexOf(e.t);
  if (k < 0) { if (Date.now() / 1000 - e.t > 200 * 86400) continue; stillPending.push(e); continue; }
  if (k + HORIZONS[e.h] >= it.close.length) { stillPending.push(e); continue; }
  const ret = (it.close[k + HORIZONS[e.h]] / it.close[k] - 1) * 100;
  const st = (journal.stats[e.h] ||= { n: 0, hit: 0, nConf: 0, hitConf: 0, brier: 0 });
  const up = ret > 0;
  st.n++; if ((e.p > 0.5) === up && e.p !== 0.5) st.hit++;
  st.brier += (e.p - (up ? 1 : 0)) ** 2;
  if (Math.abs(e.p - 0.5) >= MIN_CONF) { st.nConf++; if ((e.p > 0.5) === up) st.hitConf++; }
  const b = (journal.bench[e.h] ||= { n: 0, sum: 0 });
  b.n++; b.sum += ret;
  if (e.pick) journal.picks.unshift({ d: e.d, sym: e.sym, name: e.name, h: e.h, p: e.p, ret: Math.round(ret * 100) / 100 });
  resolved++;
}
journal.pending = stillPending;
journal.picks = journal.picks.slice(0, 200);
log(`previsions verifiees : ${resolved}, en attente : ${stillPending.length}`);

// ---------------------------------------------------------------------------
// 3. Apprentissage champion / challenger
// ---------------------------------------------------------------------------
const champion = readJson("model.json", null);
const ids = directionalIds(items[0].all);
const indNames = Object.fromEntries(items[0].all.map((x) => [x.id, x.name]));
const t0 = Date.now();
const { model, report } = trainAll(items, ids, champion && champion.source === "learned" ? champion : null, indNames);
const today = new Date();
const iso = today.toISOString().slice(0, 10);
model.version = iso;
model.createdAt = today.toISOString();
model.universe = items.length;
log(`entrainement : ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const dShort = `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const cfgName = (a) => (a === "vote" ? "vote a poids egaux" : `ridge alpha=${a}`);
for (const h of HORIZON_KEYS) {
  const r = report[h];
  if (!r || r.skipped) continue;
  log(`  ${h}: ${cfgName(r.from)} -> ${cfgName(r.to)} | IC test ${r.oos.ic} | bonne direction ${(r.oos.accConf ?? r.oos.acc) * 100 | 0}%`);
  if (r.configChanged || !champion || champion.source !== "learned") {
    journal.changes.unshift(`${dShort} - ${h} : ${!champion || champion.source !== "learned" ? "premier entrainement" : "nouvelle configuration adoptee"} (${cfgName(r.to)}), ${((r.oos.accConf ?? r.oos.acc) * 100).toFixed(1)} % de bonnes directions sur 120 seances test`);
  }
}
journal.changes = journal.changes.slice(0, 60);
const best = HORIZON_KEYS.map((h) => model.horizons[h]?.oos).filter(Boolean);
model.summary = `Modèle ré-entraîné le ${dShort} sur ${items.length} valeurs et ~3 ans d'historique ; ${Object.values(report).filter((r) => r.configChanged).length} amélioration(s) adoptée(s) aujourd'hui.`;
model.report = Object.fromEntries(Object.entries(report).map(([h, r]) => [h, { ...r, top: (r.top || []).slice(0, 5) }]));

// ---------------------------------------------------------------------------
// 4. Signaux du jour + journal des previsions
// ---------------------------------------------------------------------------
const evalOf = (it) => {
  const i = it.close.length - 1;
  const sg = sigmaAt(it.close, i, 60);
  const evals = evaluateAll(it.all, i, model, sg);
  return { i, sg, evals };
};
const rows = [];
for (const it of items) {
  const { i, sg, evals } = evalOf(it);
  const plan = buildPlan(it.c, evals, sg);
  const rel = Math.max(0.005, plan.reliability?.ic ?? 0.02);
  rows.push({ it, i, evals, plan, rank: (plan.pUp - 0.5) * rel, cur: it.c.currency });
}
const active = new Set(["ENTRER", "ATTENDRE_REPLI", "ATTENDRE_CONFIRMATION"]);
const toPick = (r) => ({
  sym: r.it.sym, name: names[r.it.sym], h: r.plan.horizon, action: r.plan.action, actionLabel: r.plan.actionLabel,
  pUp: r.plan.pUp, expPct: r.plan.expPct, start: r.plan.start, zoneLo: r.plan.zoneLo, zoneHi: r.plan.zoneHi,
  stop: r.plan.stop, target: r.plan.target, rr: r.plan.rr, pTarget: r.plan.pTarget, holdDays: r.plan.holdDays,
  reviewDate: r.plan.reviewDate, validUntil: r.plan.validUntil, cur: r.cur, expectancy: r.plan.expectancy,
});
const picks = rows.filter((r) => active.has(r.plan.action) && (r.plan.expectancy ?? 0) > 0)
  .sort((a, b) => b.rank - a.rank).slice(0, config.maxPicks || 5).map(toPick);
const avoid = rows.filter((r) => r.plan.action === "EVITER").sort((a, b) => a.rank - b.rank).slice(0, config.maxAvoid || 3).map(toPick);
const watch = (config.watchlist || []).map((s) => rows.find((r) => r.it.sym === s)).filter(Boolean).map(toPick);
const pickSet = new Set(picks.map((p) => p.sym + "|" + p.h));

// une ligne de journal par valeur et par horizon (dedoublonnee si relance le meme jour)
const have = new Set(journal.pending.map((e) => `${e.sym}|${e.h}|${e.t}`));
for (const r of rows) {
  const t = r.it.time[r.i];
  for (const h of HORIZON_KEYS) {
    const key = `${r.it.sym}|${h}|${t}`;
    if (have.has(key)) continue;
    journal.pending.push({ sym: r.it.sym, name: names[r.it.sym], h, t, d: dShort, p: Math.round(r.evals[h].pUp * 1e4) / 1e4, pick: pickSet.has(r.it.sym + "|" + h) });
  }
}
journal.since ||= iso;

const indices = INDEX_DEFS.filter((d) => !d.list && bySym[d.symbol]).map((d) => {
  const it = bySym[d.symbol];
  const { i, evals } = evalOf(it);
  const s200 = ta.last(ta.sma(it.close, 200));
  return {
    id: d.id, label: d.label, price: it.close[i], chg: (it.close[i] / it.close[i - 1] - 1) * 100,
    p1S: evals["1S"].pUp, p1M: evals["1M"].pUp, trend: it.close[i] > s200 ? "au-dessus SMA 200" : "sous SMA 200",
  };
});

// ---------------------------------------------------------------------------
// 5. Bilan et fichiers publies pour l'app
// ---------------------------------------------------------------------------
const byHorizon = {};
for (const h of HORIZON_KEYS) {
  const s = journal.stats[h];
  if (s) byHorizon[h] = { n: s.n, hit: s.hit, nConf: s.nConf, hitConf: s.hitConf, brier: s.n ? s.brier / s.n : null };
}
let picksSummary = null;
if (journal.picks.length) {
  const n = journal.picks.length;
  const avg = journal.picks.reduce((a, p) => a + p.ret, 0) / n;
  let bs = 0, bn = 0;
  for (const p of journal.picks) { const b = journal.bench[p.h]; if (b?.n) { bs += b.sum / b.n; bn++; } }
  picksSummary = { n, avg, winRate: journal.picks.filter((p) => p.ret > 0).length / n, benchAvg: bn ? bs / bn : null };
}
const track = {
  updatedAt: today.toISOString(), since: journal.since ? `${journal.since.slice(8, 10)}/${journal.since.slice(5, 7)}/${journal.since.slice(0, 4)}` : null,
  byHorizon: Object.keys(byHorizon).length ? byHorizon : null, pending: journal.pending.length,
  picks: journal.picks.slice(0, 30), picksSummary, changes: journal.changes.slice(0, 20),
};

const dateLabel = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const signals = { date: iso, dateLabel, picks, avoid, indices };

// ---------------------------------------------------------------------------
// 6. Newsletter
// ---------------------------------------------------------------------------
const headlines = FAKE ? [] : (await fetchHeadlines(INDEX_QUERY.cac + " ouverture", 3)).concat(await fetchHeadlines("Wall Street Bourse", 2));
const letter = buildLetter({ dateLabel, indices, picks, avoid, watch, track, modelInfo: model, headlines, failed: Object.keys(failed) });
fs.writeFileSync(path.join(OUT, "newsletter.html"), letter.html);
fs.writeFileSync(path.join(OUT, "newsletter.txt"), letter.whatsapp);

const day = new Date().toLocaleDateString("en-GB", { weekday: "short", timeZone: "Europe/Paris" });
const weekday = !["Sat", "Sun"].includes(day);
model.newsletter = { lastSent: champion?.newsletter?.lastSent || null, channels: channelsConfigured() };
if (NO_SEND) log("envoi desactive (--no-send) : apercu dans server/out/newsletter.html");
else if (!weekday && !FORCE_SEND) log("week-end : pas d'envoi");
else if (!channelsConfigured().length) log("aucun canal configure (voir server/README.md) : apercu dans server/out/newsletter.html");
else {
  const res = await sendAll({ subject: `Quantum Algo – ${dateLabel}`, ...letter });
  log("envoye :", res.done.join(", ") || "rien", res.errors.length ? "| erreurs : " + res.errors.join(" ; ") : "");
  if (res.done.length) model.newsletter.lastSent = today.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
  if (res.errors.length && !res.done.length) process.exitCode = 2;
}

writeJson("model.json", model);
writeJson("track.json", track);
writeJson("signals.json", signals);
writeJson("journal.json", journal, true);
log("termine.");
