import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { C, T } from "../theme";
import { useBrain } from "../Brain";

export default function SettingsScreen(props) {
  var st = props.state;
  var brain = useBrain();
  var nl = brain.model && brain.model.newsletter;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 20, gap: 12 }}>
      <Text style={[T.sans(26, "700"), { color: C.text, letterSpacing: -0.6 }]}>Reglages</Text>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16 }}>
        <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.42)", letterSpacing: 1.4, marginBottom: 14 }]}>MODELE MONTE-CARLO</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={[T.sans(12.5, "500"), { color: C.text }]}>Scenarios simules</Text>
          <Text style={[T.mono(12), { color: C.up }]}>{st.sims.toLocaleString("fr-FR")}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 7 }}>
          {[2000, 10000, 50000].map(function (n) {
            var on = n === st.sims;
            return (
              <Pressable key={n} onPress={function () { props.setState({ sims: n }); }}
                style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 11, borderWidth: 1,
                  borderColor: on ? "rgba(79,221,154,0.5)" : "rgba(255,255,255,0.12)",
                  backgroundColor: on ? "rgba(79,221,154,0.12)" : "transparent" }}>
                <Text style={[T.mono(10.5), { color: on ? C.up : "rgba(232,234,236,0.55)" }]}>{n.toLocaleString("fr-FR")}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[T.sans(10.5, "400"), { color: "rgba(232,234,236,0.4)", lineHeight: 16, marginTop: 12 }]}>
          Pres de 100 indicateurs (dont 82 directionnels) sont combines par un modele re-entraine chaque nuit ; la volatilite vient des 60 dernieres seances, avec des queues de distribution epaisses.
        </Text>
      </View>

      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 16 }}>
        <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.42)", letterSpacing: 1.4, marginBottom: 10 }]}>NEWSLETTER DU MATIN</Text>
        <Text style={[T.sans(12.5, "500"), { color: C.text, marginBottom: 6 }]}>
          {nl && nl.lastSent ? "Derniere lettre envoyee le " + nl.lastSent : "Pas encore envoyee"}
        </Text>
        <Text style={[T.sans(10.5, "400"), { color: "rgba(232,234,236,0.45)", lineHeight: 16 }]}>
          {"Chaque matin de semaine vers 7 h 30 : tendance des indices, meilleures opportunites avec horizon, zone d'entree, stop et objectif, valeurs a eviter et bilan de fiabilite. Envoi par e-mail" + (nl && nl.channels && nl.channels.length ? " (" + nl.channels.join(", ") + ")" : " et/ou WhatsApp") + ". Le reglage se fait une fois cote serveur : voir server/README.md."}
        </Text>
      </View>

      <View style={{ backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 18, padding: 16 }}>
        <Text style={[T.sans(11, "400"), { color: C.dim, lineHeight: 17 }]}>
          Donnees de marche Yahoo Finance, differees. Quantum Algo fournit des estimations statistiques de hausse et de baisse : l'application ne permet aucune transaction et ne constitue pas un conseil en investissement.
        </Text>
      </View>

      <Text style={[T.mono(9, "500"), { color: "rgba(232,234,236,0.25)", textAlign: "center", letterSpacing: 1 }]}>VERSION 6.0 - MODELE AUTO-EVALUE</Text>
    </ScrollView>
  );
}
