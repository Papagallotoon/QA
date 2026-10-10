// Bilan : ce que le modele a reellement reussi, mesure chaque jour par le serveur.
// Aucun chiffre ici n'est invente : sans donnees du serveur, l'ecran le dit.

import React from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { C, T } from "../theme";
import { useBrain } from "../Brain";
import { HORIZON_KEYS, HORIZON_LABEL } from "../core/model.js";

function Card(props) {
  return <View style={[{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16 }, props.style]}>{props.children}</View>;
}
function Label(props) {
  return <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.42)", letterSpacing: 1.4, marginBottom: 10 }, props.style]}>{props.children}</Text>;
}
function pc(v) { return v == null || isNaN(v) ? "-" : (v * 100).toFixed(1).replace(".", ",") + " %"; }
function sp(v) { return v == null || isNaN(v) ? "-" : (v >= 0 ? "+" : "") + v.toFixed(2).replace(".", ",") + " %"; }
function rateColor(r) { return r == null ? C.dim : r >= 0.55 ? C.up : r >= 0.5 ? C.flat : C.down; }

function Bar(props) {
  var few = props.n != null && props.n < 20;
  var w = props.v == null || few ? 0 : Math.max(0, Math.min(100, ((props.v - 0.4) / 0.3) * 100));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 }}>
      <Text style={[T.mono(12), { color: C.text, width: 30 }]}>{props.k}</Text>
      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)" }}>
        <View style={{ width: w + "%", height: 6, borderRadius: 3, backgroundColor: rateColor(props.v) }} />
      </View>
      <Text style={[T.sans(12.5, "600"), { color: few ? C.dim : rateColor(props.v), width: 58, textAlign: "right" }]}>{few ? "mesure..." : pc(props.v)}</Text>
      <Text style={[T.mono(9, "500"), { color: C.dimmer, width: 52, textAlign: "right" }]}>{props.n != null ? "n=" + props.n : ""}</Text>
    </View>
  );
}

export default function TrustScreen(props) {
  var b = useBrain();
  var m = b.model, tr = b.track, sg = b.signals;
  var learned = m && m.source === "learned";
  var [busy, setBusy] = React.useState(false);

  function reload() { setBusy(true); Promise.resolve(b.refresh()).finally(function () { setBusy(false); }); }

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={reload} tintColor={C.dim} />}
      contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 24, gap: 12 }}>
      <Text style={[T.sans(26, "700"), { color: C.text, letterSpacing: -0.6 }]}>Bilan</Text>
      <Text style={[T.sans(12, "400"), { color: C.dim, lineHeight: 18 }]}>
        Chaque nuit, le serveur verifie les previsions arrivees a echeance, re-entraine le modele et ne garde la nouvelle version que si elle fait mieux sur des seances qu'elle n'a jamais vues.
      </Text>

      <Card>
        <Label>ETAT DU MODELE</Label>
        <Text style={[T.sans(15, "600"), { color: learned ? C.up : C.flat }]}>
          {learned ? "Modele appris du " + (m.version || "?") : "Modele par defaut (vote a poids egaux)"}
        </Text>
        <Text style={[T.sans(11, "400"), { color: C.dim, marginTop: 6, lineHeight: 16 }]}>
          {b.status === "en ligne" ? "Synchronise avec le serveur." : b.status === "hors ligne" ? "Derniere version enregistree sur le telephone (hors ligne)." : "Serveur pas encore joignable" + (b.error ? " (" + b.error + ")" : "") + ". Voir server/README.md pour l'activer."}
        </Text>
      </Card>

      {sg && sg.picks && sg.picks.length ? (
        <Card>
          <Label>{"SELECTION DU " + (sg.dateLabel || sg.date || "").toUpperCase()}</Label>
          {sg.picks.map(function (p) {
            return (
              <Pressable key={p.sym + p.h} onPress={function () { props.open(p.sym); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.borderSoft }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[T.sans(13, "600"), { color: C.text }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[T.mono(9, "500"), { color: C.dimmer, marginTop: 2 }]}>{p.actionLabel + " / " + (HORIZON_LABEL[p.h] || p.h)}</Text>
                </View>
                <Text style={[T.sans(13, "700"), { color: C.up }]}>{Math.round(p.pUp * 100) + " %"}</Text>
                <Text style={[T.sans(16, "500"), { color: "rgba(232,234,236,0.3)" }]}>{"›"}</Text>
              </Pressable>
            );
          })}
        </Card>
      ) : null}

      <Card>
        <Label>EN CONDITIONS REELLES</Label>
        {tr && tr.byHorizon ? (
          <View>
            <Text style={[T.sans(11, "400"), { color: C.dim, marginBottom: 4, lineHeight: 16 }]}>
              {"Previsions enregistrees chaque matin puis comparees au cours reel a echeance" + (tr.since ? ", depuis le " + tr.since : "") + ". Taux de bonne direction quand le modele avait un avis (proba >= 53 % ou <= 47 %) :"}
            </Text>
            {HORIZON_KEYS.map(function (h) {
              var x = tr.byHorizon[h] || {};
              return <Bar key={h} k={h} v={x.nConf ? x.hitConf / x.nConf : null} n={x.nConf || 0} />;
            })}
            {tr.pending != null ? (
              <Text style={[T.mono(9, "500"), { color: C.dimmer, marginTop: 6 }]}>{tr.pending + " PREVISIONS EN ATTENTE D'ECHEANCE"}</Text>
            ) : null}
          </View>
        ) : (
          <Text style={[T.sans(11.5, "400"), { color: C.dim, lineHeight: 17 }]}>
            Pas encore de prevision arrivee a echeance. Les premiers resultats reels apparaissent le lendemain du premier passage du serveur (1 jour), puis apres 1 semaine, 1 mois et 3 mois.
          </Text>
        )}
      </Card>

      <Card>
        <Label>TEST HORS ECHANTILLON (120 DERNIERES SEANCES)</Label>
        {learned ? (
          <View>
            {HORIZON_KEYS.map(function (h) {
              var o = m.horizons[h] && m.horizons[h].oos;
              return <Bar key={h} k={h} v={o ? (o.accConf != null ? o.accConf : o.acc) : null} n={o ? (o.nConf || o.n) : null} />;
            })}
            <Text style={[T.sans(10.5, "400"), { color: C.dimmer, marginTop: 6, lineHeight: 15 }]}>
              Au-dessus de 50 % = mieux que pile ou face. En bourse, 53 a 56 % de bonnes directions de facon reguliere est deja un tres bon resultat ; mefie-toi de tout outil qui annonce 70 % ou plus.
            </Text>
          </View>
        ) : (
          <Text style={[T.sans(11.5, "400"), { color: C.dim, lineHeight: 17 }]}>Disponible apres le premier entrainement du serveur.</Text>
        )}
      </Card>

      {tr && tr.picks && tr.picks.length ? (
        <Card>
          <Label>DERNIERES SELECTIONS ARRIVEES A ECHEANCE</Label>
          {tr.picks.slice(0, 15).map(function (p, i) {
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 }}>
                <Text style={[T.mono(9.5, "500"), { color: C.dimmer, width: 44 }]}>{p.d}</Text>
                <Text style={[T.sans(12, "500"), { color: C.text, flex: 1 }]} numberOfLines={1}>{p.name + " (" + p.h + ")"}</Text>
                <Text style={[T.mono(11), { color: p.ret >= 0 ? C.up : C.down }]}>{sp(p.ret)}</Text>
              </View>
            );
          })}
          {tr.picksSummary ? (
            <Text style={[T.sans(11, "400"), { color: C.dim, marginTop: 8, lineHeight: 16 }]}>
              {"Rendement moyen des selections : " + sp(tr.picksSummary.avg) + " (" + tr.picksSummary.n + " positions, " + pc(tr.picksSummary.winRate) + " gagnantes), contre " + sp(tr.picksSummary.benchAvg) + " pour l'ensemble des valeurs suivies."}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {tr && tr.changes && tr.changes.length ? (
        <Card>
          <Label>JOURNAL DES AMELIORATIONS</Label>
          {tr.changes.slice(0, 10).map(function (c, i) {
            return <Text key={i} style={[T.sans(11, "400"), { color: C.dim, lineHeight: 17 }]}>{"• " + c}</Text>;
          })}
        </Card>
      ) : null}
    </ScrollView>
  );
}
