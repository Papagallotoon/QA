import React from "react";
import { View, Text, Pressable } from "react-native";
import { C, T } from "../theme";
import { HORIZON_KEYS, HORIZON_LABEL } from "../core/model.js";
import { frDate } from "../core/plan.js";

function fr(v, d) { return v == null || isNaN(v) ? "-" : v.toFixed(d == null ? 2 : d).replace(".", ","); }
function pc(v) { return v == null || isNaN(v) ? "-" : Math.round(v * 100) + " %"; }

var ACTION_COLOR = {
  ENTRER: C.up,
  ATTENDRE_REPLI: "#f2c14e",
  ATTENDRE_CONFIRMATION: "#f2c14e",
  EVITER: C.down,
  NEUTRE: C.flat,
};

function Line(props) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 5 }}>
      <Text style={[T.sans(11.5, "400"), { color: C.dim }]}>{props.k}</Text>
      <Text style={[T.mono(11.5), { color: props.color || "rgba(232,234,236,0.88)" }]}>{props.v}</Text>
    </View>
  );
}

export default function PlanCard(props) {
  var p = props.plan, cur = props.currency ? " " + props.currency : "";
  if (!p) return null;
  var col = ACTION_COLOR[p.action] || C.flat;
  var active = p.action === "ENTRER" || p.action === "ATTENDRE_REPLI" || p.action === "ATTENDRE_CONFIRMATION";

  return (
    <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: active ? "rgba(79,221,154,0.28)" : C.border, borderRadius: 18, padding: 16 }}>
      <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.42)", letterSpacing: 1.4, marginBottom: 10 }]}>PLAN DE POSITION</Text>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={[T.sans(20, "700"), { color: col, letterSpacing: -0.4 }]}>{p.actionLabel}</Text>
        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.07)" }}>
          <Text style={[T.mono(10), { color: C.text }]}>{"HORIZON " + p.horizonLabel.toUpperCase()}</Text>
        </View>
      </View>
      {p.start ? <Text style={[T.sans(12.5, "500"), { color: C.text, marginBottom: 10 }]}>{p.start}</Text> : null}

      {active ? (
        <View style={{ borderTopWidth: 1, borderTopColor: C.borderSoft, paddingTop: 6 }}>
          <Line k="Zone d'entree" v={fr(p.zoneLo) + " - " + fr(p.zoneHi) + cur} />
          <Line k="Ordre valable jusqu'au" v={p.validUntil ? frDate(p.validUntil) : "-"} />
          <Line k="Stop de protection" v={fr(p.stop) + cur + "  (-" + fr(p.riskPct, 1) + " %)"} color={C.down} />
          <Line k="Objectif" v={fr(p.target) + cur + "  (+" + fr(p.gainPct, 1) + " %)"} color={C.up} />
          <Line k="Ratio gain / risque" v={fr(p.rr, 1)} />
          <Line k="Objectif atteint avant le stop" v={pc(p.pTarget)} />
          <Line k="Duree de detention" v={p.holdDays + " seances (" + p.horizonLabel + ")"} />
          <Line k="Reevaluer le" v={p.reviewDate ? frDate(p.reviewDate) : "-"} />
          <Line k="Taille pour risquer 1 % du capital" v={fr(p.sizePct, 0) + " % du capital"} />
        </View>
      ) : (
        <View style={{ borderTopWidth: 1, borderTopColor: C.borderSoft, paddingTop: 6 }}>
          {p.stop ? <Line k="Protection si deja detenu" v={fr(p.stop) + cur} color={C.down} /> : null}
          <Line k="Reevaluer le" v={p.reviewDate ? frDate(p.reviewDate) : "-"} />
        </View>
      )}

      <View style={{ marginTop: 10, gap: 5 }}>
        {(p.why || []).map(function (w, i) {
          return <Text key={i} style={[T.sans(11, "400"), { color: "rgba(232,234,236,0.62)", lineHeight: 16 }]}>{"• " + w}</Text>;
        })}
      </View>

      {p.evals ? (
        <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.borderSoft }}>
          <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.42)", letterSpacing: 1.2, marginBottom: 8 }]}>PROBABILITE DE HAUSSE PAR HORIZON</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {HORIZON_KEYS.map(function (h) {
              var e = p.evals[h], on = h === p.horizon;
              var c2 = e.pUp >= 0.53 ? C.up : e.pUp <= 0.47 ? C.down : C.flat;
              return (
                <Pressable key={h} onPress={function () { if (props.onPickHorizon) props.onPickHorizon(h); }}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, borderWidth: 1,
                    borderColor: on ? "rgba(79,221,154,0.5)" : "rgba(255,255,255,0.08)",
                    backgroundColor: on ? "rgba(79,221,154,0.08)" : "transparent" }}>
                  <Text style={[T.mono(9), { color: C.dim, marginBottom: 3 }]}>{h}</Text>
                  <Text style={[T.sans(13, "700"), { color: c2 }]}>{Math.round(e.pUp * 100) + "%"}</Text>
                  <Text style={[T.mono(8.5, "500"), { color: C.dimmer, marginTop: 2 }]}>{(e.expPct >= 0 ? "+" : "") + fr(e.expPct, 1) + "%"}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[T.sans(10, "400"), { color: C.dimmer, marginTop: 8, lineHeight: 14 }]}>
            {"Touchez un horizon pour recalculer le plan. " + (p.reliability ? "Fiabilite mesuree sur " + HORIZON_LABEL[p.horizon] + " : " + Math.round((p.reliability.accConf || p.reliability.acc) * 100) + " % de bonnes directions sur " + (p.reliability.nConf || p.reliability.n) + " cas recents." : "Fiabilite pas encore mesuree (modele par defaut).")}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
