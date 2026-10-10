// src/components/EducationalTooltip.js
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useLearningMode } from "../context/LearningModeContext";

// Base de connaissances des termes financiers
const EDUCATIONAL_CONTENT = {
  rsi: {
    title: "RSI (Relative Strength Index)",
    emoji: "📊",
    shortDesc: "Indicateur de momentum entre 0 et 100",
    fullDesc: `Le RSI mesure la force et la vitesse des mouvements de prix.

🎯 Comment l'interpréter :
• RSI > 70 : Zone de surachat - le prix a peut-être trop monté, risque de correction
• RSI < 30 : Zone de survente - le prix a peut-être trop baissé, opportunité de rebond
• RSI entre 40-60 : Zone neutre, pas de signal clair

💡 Astuce : Un RSI à 80+ dans une forte tendance haussière peut rester élevé longtemps. Ne pas shorter uniquement sur ce signal !`,
    example: "Si Apple a un RSI de 75, cela signifie que l'action est dans une zone de surachat. Les acheteurs dominent mais attention au retournement.",
  },

  sma: {
    title: "SMA (Simple Moving Average)",
    emoji: "📈",
    shortDesc: "Moyenne mobile des prix sur N jours",
    fullDesc: `Les moyennes mobiles lissent les fluctuations pour identifier la tendance.

🎯 Utilisations principales :
• SMA20 : Tendance court terme (environ 1 mois)
• SMA50 : Tendance moyen terme (environ 2-3 mois)
• SMA200 : Tendance long terme (environ 1 an)

📊 Signaux importants :
• Prix > SMA : Tendance haussière
• Prix < SMA : Tendance baissière
• SMA20 croise SMA50 vers le haut : "Golden Cross" = signal haussier
• SMA20 croise SMA50 vers le bas : "Death Cross" = signal baissier`,
    example: "Si Total se trade à 55€ avec SMA20 à 53€ et SMA50 à 50€, la tendance est clairement haussière.",
  },

  atr: {
    title: "ATR (Average True Range)",
    emoji: "🌊",
    shortDesc: "Mesure la volatilité moyenne du prix",
    fullDesc: `L'ATR mesure l'amplitude moyenne des mouvements de prix sur 14 jours.

🎯 Comment l'utiliser :
• ATR élevé : Forte volatilité, prix bouge beaucoup
• ATR faible : Faible volatilité, prix calme

💰 Utilité pour le trading :
• Position sizing : Plus l'ATR est élevé, plus on réduit la taille de position
• Stop Loss : Placer le SL à 1.5x ou 2x l'ATR pour éviter d'être sorti par le "bruit"
• Breakout : Un ATR qui augmente confirme souvent une cassure`,
    example: "Action avec ATR de 2€ : prévoir des mouvements quotidiens de ±2€. Ajuster ton SL en conséquence.",
  },

  adx: {
    title: "ADX (Average Directional Index)",
    emoji: "🎯",
    shortDesc: "Mesure la force d'une tendance (0-100)",
    fullDesc: `L'ADX ne dit PAS la direction, uniquement si une tendance est forte ou faible.

🎯 Interprétation :
• ADX < 20 : Pas de tendance claire, marché en range/consolidation
• ADX 20-25 : Début de tendance possible
• ADX 25-50 : Tendance forte et établie
• ADX > 50 : Tendance très forte (attention à l'épuisement)

💡 Combine avec DI+ et DI- :
• DI+ > DI- : Tendance haussière
• DI- > DI+ : Tendance baissière
• L'ADX mesure juste la force`,
    example: "ADX à 35 + DI+ > DI- = forte tendance haussière en cours. C'est le moment de suivre la tendance !",
  },

  supertrend: {
    title: "Supertrend",
    emoji: "🚀",
    shortDesc: "Indicateur de suivi de tendance",
    fullDesc: `Le Supertrend combine ATR et prix pour identifier la tendance.

🎯 Comment ça marche :
• Signal VERT (haussier) : Prix au-dessus de la ligne, on reste acheteur
• Signal ROUGE (baissier) : Prix en-dessous, on reste vendeur

📊 Points forts :
• Très visuel et simple à comprendre
• Filtre le "bruit" du marché
• Excellents signaux en tendance
• Peut donner stop loss dynamique

⚠️ Limite : Donne des faux signaux en range (marché sans tendance)`,
    example: "Airbus passe en Supertrend vert = signal d'achat. Reste en position tant que c'est vert.",
  },

  stopLoss: {
    title: "Stop Loss (SL)",
    emoji: "🛡️",
    shortDesc: "Ordre automatique pour limiter les pertes",
    fullDesc: `Le Stop Loss est ton assurance-vie en trading !

🎯 Pourquoi c'est VITAL :
• Limite les pertes à un montant prédéfini
• Évite les décisions émotionnelles
• Protège ton capital

💰 Règle d'or : Ne jamais risquer plus de 1-2% du capital par trade

📊 Comment placer un SL :
• Sous un support technique
• Sous la SMA20/50 selon ton horizon
• À 1.5-2x l'ATR du prix d'entrée
• Jamais déplacer un SL vers le bas !`,
    example: "Capital 10 000€, risque 1% = 100€ max. Action à 50€, SL à 48€ = risque 2€/action → acheter 50 actions max.",
  },

  takeProfit: {
    title: "Take Profit (TP)",
    emoji: "🎯",
    shortDesc: "Objectif de gain pour sécuriser les profits",
    fullDesc: `Le Take Profit définit à quel prix tu sors avec un gain.

🎯 Règle du ratio Risk/Reward :
• Minimum 1:2 (risque 1€ pour gagner 2€)
• Idéal 1:3 ou plus

📊 Où placer le TP :
• À une résistance technique
• Fibonacci 1.618 de l'ATR
• 2-3x la distance du Stop Loss
• Près d'un plus haut précédent

💡 Stratégie : Sortir 50% au TP1, laisser courir 50% avec SL ajusté au point d'entrée = "risk-free"`,
    example: "Entrée 100€, SL 95€ (risque 5€) → TP à 110€ (gain 10€) = ratio 1:2 ✅",
  },

  bias: {
    title: "Biais de marché",
    emoji: "🧭",
    shortDesc: "Direction anticipée du mouvement",
    fullDesc: `Le biais indique la direction probable du prix selon l'analyse.

🎯 Types de biais :
• Haussier 📈 : Les signaux indiquent une hausse probable
• Baissier 📉 : Les signaux indiquent une baisse probable
• Neutre ⚖️ : Pas de direction claire, marché en indécision

💡 Comment on le calcule :
• Convergence de plusieurs indicateurs (RSI, SMA, ADX)
• Patterns de chandeliers
• Cassures de supports/résistances
• Volume et momentum

⚠️ Attention : Un biais n'est pas une certitude, c'est une probabilité !`,
    example: "Total : RSI 65, prix > SMA20 > SMA50, Supertrend vert → Biais HAUSSIER à 75/100",
  },

  score: {
    title: "Score Bot (0-100)",
    emoji: "🤖",
    shortDesc: "Note de confiance de l'analyse",
    fullDesc: `Le score mesure la qualité et la convergence des signaux.

🎯 Échelle de notation :
• 80-100 : Signal très fort, plusieurs indicateurs convergent
• 60-79 : Signal solide, bonne probabilité
• 40-59 : Signal modéré, prudence
• 0-39 : Signal faible, attention

📊 Critères pris en compte :
• Nombre d'indicateurs qui convergent
• Force de la tendance (ADX)
• Position du prix vs moyennes mobiles
• Patterns de chandeliers détectés
• Momentum (RSI)

💡 Règle : Ne trader que les scores > 70 pour maximiser les probabilités`,
    example: "Score 85 en biais haussier = 5 indicateurs sur 6 sont alignés. Signal fort !",
  },

  patterns: {
    title: "Patterns de chandeliers",
    emoji: "🕯️",
    shortDesc: "Formations de bougies qui donnent des signaux",
    fullDesc: `Les patterns sont des configurations de bougies reconnues qui anticipent des mouvements.

🟢 Patterns HAUSSIERS :
• Marteau : Rebond après baisse
• Morning Star : Retournement haussier
• Englobante haussière : Forte reprise
• Three White Soldiers : Forte hausse continue

🔴 Patterns BAISSIERS :
• Shooting Star : Rejet en haut
• Evening Star : Retournement baissier  
• Englobante baissière : Forte baisse
• Three Black Crows : Forte baisse continue

⚖️ Patterns NEUTRES :
• Doji : Indécision du marché
• Harami : Consolidation avant mouvement`,
    example: "Un marteau en bas d'une tendance baissière + RSI < 30 = signal de rebond puissant !",
  },
};

export default function EducationalTooltip({ term, children, inline = false }) {
  const { enabled } = useLearningMode();
  const [modalVisible, setModalVisible] = useState(false);

  // Si mode éducatif désactivé, afficher juste le contenu
  if (!enabled) {
    return <>{children}</>;
  }

  const content = EDUCATIONAL_CONTENT[term?.toLowerCase()];
  
  // Si pas de contenu éducatif pour ce terme, afficher normalement
  if (!content) {
    return <>{children}</>;
  }

  const handlePress = () => {
    setModalVisible(true);
  };

  return (
    <>
      <TouchableOpacity 
        onPress={handlePress} 
        activeOpacity={0.7}
        style={inline ? styles.inlineWrapper : null}
      >
        <View style={styles.termWrapper}>
          {children}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>?</Text>
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalEmoji}>{content.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{content.title}</Text>
                  <Text style={styles.modalShortDesc}>{content.shortDesc}</Text>
                </View>
              </View>

              {/* Full Description */}
              <View style={styles.section}>
                <Text style={styles.sectionText}>{content.fullDesc}</Text>
              </View>

              {/* Example */}
              {content.example && (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleLabel}>💡 Exemple concret :</Text>
                  <Text style={styles.exampleText}>{content.example}</Text>
                </View>
              )}

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.closeButtonText}>J'ai compris ✓</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  inlineWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  termWrapper: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    padding: 24,
    maxWidth: 500,
    width: "100%",
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#1e293b",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },

  // Header
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  modalEmoji: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#f1f5f9",
    marginBottom: 4,
  },
  modalShortDesc: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
  },

  // Content
  section: {
    marginBottom: 20,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#cbd5e1",
    fontWeight: "500",
  },

  // Example box
  exampleBox: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: "#22c55e",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  exampleLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#22c55e",
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#cbd5e1",
    fontWeight: "500",
  },

  // Close button
  closeButton: {
    backgroundColor: "#22c55e",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  closeButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
});