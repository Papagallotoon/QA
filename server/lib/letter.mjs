// Mise en page de la newsletter (HTML pour l'e-mail, texte court pour WhatsApp).

const HL = { "1J": "1 jour", "1S": "1 semaine", "1M": "1 mois", "3M": "3 mois" };
const f2 = (v) => (v == null || isNaN(v) ? "-" : v.toFixed(2).replace(".", ","));
const pc = (p) => (p == null || isNaN(p) ? "-" : Math.round(p * 100) + " %");
const sp = (v) => (v == null || isNaN(v) ? "-" : (v >= 0 ? "+" : "") + v.toFixed(2).replace(".", ",") + " %");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dShort = (d) => (d ? `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}` : "-");

export function buildLetter({ dateLabel, indices, picks, avoid, watch, track, modelInfo, headlines, failed }) {
  const green = "#1f9d63", red = "#d2483a", grey = "#6b7280";
  const col = (p) => (p >= 0.53 ? green : p <= 0.47 ? red : grey);

  const th = (t) => `<th style="text-align:left;padding:6px 8px;font-size:11px;color:#6b7280;border-bottom:1px solid #e5e7eb">${t}</th>`;
  const td = (t, s = "") => `<td style="padding:7px 8px;font-size:13px;border-bottom:1px solid #f1f3f5;${s}">${t}</td>`;

  const idxRows = indices.map((x) => `<tr>${td(`<b>${esc(x.label)}</b>`)}${td(f2(x.price))}${td(sp(x.chg), `color:${x.chg >= 0 ? green : red}`)}${td(pc(x.p1S), `color:${col(x.p1S)};font-weight:600`)}${td(pc(x.p1M), `color:${col(x.p1M)};font-weight:600`)}${td(x.trend)}</tr>`).join("");

  const pickRows = picks.map((p) => `
    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin:10px 0">
      <div style="display:flex;justify-content:space-between"><b style="font-size:15px">${esc(p.name)}</b> <span style="color:${green};font-weight:700">${pc(p.pUp)} de hausse</span></div>
      <div style="font-size:12px;color:#6b7280;margin:2px 0 8px">${esc(p.sym)} · ${esc(p.actionLabel)} · horizon ${HL[p.h]} · attendu ${sp(p.expPct)}</div>
      <table style="font-size:13px;border-collapse:collapse;width:100%">
        <tr><td style="color:#6b7280;padding:2px 0">Quand</td><td style="text-align:right">${esc(p.start)}</td></tr>
        <tr><td style="color:#6b7280;padding:2px 0">Zone d'entrée</td><td style="text-align:right">${f2(p.zoneLo)} – ${f2(p.zoneHi)} ${esc(p.cur)} (jusqu'au ${dShort(p.validUntil)})</td></tr>
        <tr><td style="color:#6b7280;padding:2px 0">Stop / Objectif</td><td style="text-align:right"><span style="color:${red}">${f2(p.stop)}</span> / <span style="color:${green}">${f2(p.target)}</span> (gain/risque ${f2(p.rr)})</td></tr>
        <tr><td style="color:#6b7280;padding:2px 0">Objectif avant stop</td><td style="text-align:right">${pc(p.pTarget)} des scénarios</td></tr>
        <tr><td style="color:#6b7280;padding:2px 0">Garder</td><td style="text-align:right">${p.holdDays} séances, réévaluer le ${dShort(p.reviewDate)}</td></tr>
      </table>
    </div>`).join("");

  const avoidRows = avoid.map((p) => `<tr>${td(`<b>${esc(p.name)}</b>`)}${td(pc(p.pUp), `color:${red};font-weight:600`)}${td(HL[p.h])}${td("protection " + f2(p.stop))}</tr>`).join("");
  const watchRows = watch.map((p) => `<tr>${td(`<b>${esc(p.name)}</b>`)}${td(esc(p.actionLabel))}${td(pc(p.pUp), `color:${col(p.pUp)};font-weight:600`)}${td(HL[p.h])}</tr>`).join("");

  const trackRows = ["1J", "1S", "1M", "3M"].map((h) => {
    const x = track?.byHorizon?.[h];
    const live = x && x.nConf >= 20 ? pc(x.hitConf / x.nConf) + ` (${x.nConf})` : "en cours de mesure";
    const o = modelInfo?.horizons?.[h]?.oos;
    const test = o ? pc(o.accConf ?? o.acc) : "-";
    return `<tr>${td(HL[h])}${td(live)}${td(test)}</tr>`;
  }).join("");

  const news = (headlines || []).map((n) => `<li style="margin:4px 0"><a href="${esc(n.link)}" style="color:#111827">${esc(n.title)}</a> <span style="color:#9ca3af">${esc(n.source)}</span></li>`).join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
  <div style="max-width:640px;margin:0 auto;padding:20px">
    <div style="background:#0a0c10;color:#e8eaec;border-radius:14px;padding:18px 20px">
      <div style="font-family:monospace;letter-spacing:2px;font-size:11px;color:#4fdd9a">QUANTUM ALGO</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px">La lettre du matin</div>
      <div style="font-size:13px;color:#9aa1a9">${esc(dateLabel)}</div>
    </div>
    <div style="background:#fff;border-radius:14px;padding:16px 18px;margin-top:12px">
      <h3 style="margin:0 0 8px">Les indices</h3>
      <table style="width:100%;border-collapse:collapse"><tr>${th("Indice")}${th("Clôture")}${th("Veille")}${th("Hausse 1 sem.")}${th("Hausse 1 mois")}${th("Tendance")}</tr>${idxRows}</table>
    </div>
    <div style="background:#fff;border-radius:14px;padding:16px 18px;margin-top:12px">
      <h3 style="margin:0 0 4px">Opportunités du jour</h3>
      <div style="font-size:12px;color:#6b7280">Classées par avantage statistique, pondéré par la fiabilité mesurée du modèle sur l'horizon.</div>
      ${pickRows || '<p style="color:#6b7280">Aucune valeur ne présente un avantage suffisant aujourd\'hui. Rester à l\'écart est aussi une décision.</p>'}
    </div>
    ${avoid.length ? `<div style="background:#fff;border-radius:14px;padding:16px 18px;margin-top:12px"><h3 style="margin:0 0 8px">À éviter / alléger</h3><table style="width:100%;border-collapse:collapse"><tr>${th("Valeur")}${th("Hausse")}${th("Horizon")}${th("Si détenue")}</tr>${avoidRows}</table></div>` : ""}
    ${watch.length ? `<div style="background:#fff;border-radius:14px;padding:16px 18px;margin-top:12px"><h3 style="margin:0 0 8px">Ta liste</h3><table style="width:100%;border-collapse:collapse"><tr>${th("Valeur")}${th("Action")}${th("Hausse")}${th("Horizon")}</tr>${watchRows}</table></div>` : ""}
    <div style="background:#fff;border-radius:14px;padding:16px 18px;margin-top:12px">
      <h3 style="margin:0 0 8px">Le modèle se vérifie</h3>
      <table style="width:100%;border-collapse:collapse"><tr>${th("Horizon")}${th("Bonne direction en réel")}${th("Test sur 120 séances")}</tr>${trackRows}</table>
      <p style="font-size:12px;color:#6b7280;margin:8px 0 0">${esc(modelInfo?.summary || "")}</p>
      ${track?.picksSummary ? `<p style="font-size:12px;color:#6b7280;margin:6px 0 0">Sélections passées : ${sp(track.picksSummary.avg)} en moyenne (${track.picksSummary.n} positions), contre ${sp(track.picksSummary.benchAvg)} pour l'ensemble des valeurs.</p>` : ""}
    </div>
    ${news ? `<div style="background:#fff;border-radius:14px;padding:16px 18px;margin-top:12px"><h3 style="margin:0 0 8px">À lire</h3><ul style="padding-left:18px;margin:0;font-size:13px">${news}</ul></div>` : ""}
    <p style="font-size:11px;color:#9ca3af;line-height:16px;margin-top:14px">Information statistique générée automatiquement à partir de données Yahoo Finance différées. Ce n'est pas un conseil en investissement personnalisé : les performances passées ne préjugent pas des performances futures et tout investissement en actions peut entraîner une perte en capital.${failed?.length ? ` Données indisponibles ce matin : ${esc(failed.join(", "))}.` : ""}</p>
  </div></body></html>`;

  const lines = [];
  lines.push(`*Quantum Algo – ${dateLabel}*`, "");
  lines.push("*Indices* (proba hausse 1 sem.)");
  indices.forEach((x) => lines.push(`${x.label} ${sp(x.chg)} → ${pc(x.p1S)}`));
  lines.push("", "*Opportunités*");
  if (!picks.length) lines.push("Aucune aujourd'hui.");
  picks.forEach((p) => lines.push(`• ${p.name} – ${p.actionLabel} (${HL[p.h]}) ${pc(p.pUp)}\n  entrée ${f2(p.zoneLo)}-${f2(p.zoneHi)}, stop ${f2(p.stop)}, objectif ${f2(p.target)}, revoir le ${dShort(p.reviewDate)}`));
  if (avoid.length) { lines.push("", "*À éviter*"); avoid.forEach((p) => lines.push(`• ${p.name} ${pc(p.pUp)} (${HL[p.h]})`)); }
  if (track?.byHorizon) {
    const x = track.byHorizon["1S"];
    if (x?.nConf >= 20) lines.push("", `Fiabilité réelle 1 sem. : ${pc(x.hitConf / x.nConf)} sur ${x.nConf} prévisions`);
  }
  lines.push("", "_Info statistique, pas un conseil._");
  const whatsapp = lines.join("\n");

  const text = whatsapp.replace(/\*/g, "").replace(/_/g, "");
  return { html, text, whatsapp };
}
