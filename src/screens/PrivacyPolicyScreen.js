import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import FuturisticBackButton from "../components/FuturisticBackButton";

const EMAIL = "quantumalgo@gmail.com"; // change si tu veux

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.root}>
	<FuturisticBackButton />
      <View style={styles.header}>
        <Text style={styles.title}>Politique de confidentialité</Text>
        <Text style={styles.subtitle}>
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.h2}>Résumé</Text>
          <Text style={styles.p}>
            Quantum Algo respecte la vie privée de ses utilisateurs. L’application est conçue pour fournir des informations
            et des analyses à des fins éducatives et informatives.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Données collectées</Text>
          <Text style={styles.p}>• Aucune création de compte n’est requise.</Text>
          <Text style={styles.p}>• Aucune donnée personnelle identifiable n’est volontairement collectée.</Text>
          <Text style={styles.p}>
            • Des données techniques anonymes peuvent être collectées automatiquement par l’OS ou des services standards
            (ex : diagnostics de crash, performance) afin d’améliorer la stabilité.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Données affichées</Text>
          <Text style={styles.p}>
            L’application affiche des informations de marché, analyses techniques et actualités provenant de sources publiques
            et/ou de fournisseurs de données.
          </Text>
          <Text style={styles.p}>
            Quantum Algo ne permet pas d’effectuer des transactions financières et ne demande aucune connexion à un portefeuille.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Partage des données</Text>
          <Text style={styles.p}>• Aucune donnée personnelle n’est vendue.</Text>
          <Text style={styles.p}>
            • Aucune donnée personnelle identifiable n’est partagée avec des tiers à des fins marketing.
          </Text>
          <Text style={styles.p}>
            • Les données techniques anonymes (si présentes) servent uniquement à la sécurité et à l’amélioration de l’app.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Sécurité</Text>
          <Text style={styles.p}>
            Nous mettons en place des mesures raisonnables pour protéger l’application et limiter les abus. Aucun système
            n’étant infaillible, l’utilisateur doit également sécuriser son appareil (code, biométrie, mises à jour…).
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Avertissement important</Text>
          <Text style={styles.pStrong}>
            ⚠️ Quantum Algo ne fournit pas de conseil financier. Application éducative et informative.
          </Text>
          <Text style={styles.p}>
            Les analyses, scores, signaux et niveaux affichés sont indicatifs et ne constituent pas une recommandation
            d’achat/vente, ni une incitation à agir sur les marchés.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Contact</Text>
          <Text style={styles.p}>Pour toute question : {EMAIL}</Text>

          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(`mailto:${EMAIL}?subject=Quantum%20Algo%20-%20Confidentialité`)}
          >
            <Text style={styles.ctaText}>Nous contacter</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  title: { color: "#f9fafb", fontSize: 20, fontWeight: "900" },
  subtitle: { color: "#9ca3af", fontSize: 11, marginTop: 4, fontWeight: "700" },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#0b1220",
    padding: 12,
    marginBottom: 12,
  },
  h2: { color: "#f9fafb", fontSize: 14, fontWeight: "900", marginBottom: 6 },
  p: { color: "#cbd5e1", fontSize: 12.5, lineHeight: 18, marginBottom: 6 },
  pStrong: { color: "#facc15", fontSize: 12.5, lineHeight: 18, fontWeight: "900" },

  cta: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    alignSelf: "flex-start",
  },
  ctaText: { color: "#e5e7eb", fontWeight: "900", fontSize: 12 },
});
