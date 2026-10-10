import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function MiniDisclaimer({ style }) {
  const navigation = useNavigation();

  const go = () => {
    // marche même si on est dans un tab/stack imbriqué
    const parent = navigation.getParent?.();
    if (parent?.navigate) parent.navigate("PrivacyPolicy");
    else navigation.navigate("PrivacyPolicy");
  };

  return (
    <View style={[styles.wrap, style]}>
      <View pointerEvents="none" style={styles.glow} />
      <TouchableOpacity activeOpacity={0.85} onPress={go} style={styles.touch}>
        <Text style={styles.text} numberOfLines={2}>
          ⚠️ Attention : application éducative et informative, pas de conseil financier.
          <Text style={styles.link}> En savoir plus</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.18)",
    backgroundColor: "rgba(11,18,32,0.72)",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -40,
    left: -40,
    right: -40,
    height: 90,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.10)",
    transform: [{ rotate: "-8deg" }],
  },
  touch: { paddingVertical: 10, paddingHorizontal: 12 },
  text: {
    color: "#9ca3af",
    fontSize: 11.3,
    lineHeight: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  link: {
    color: "#facc15",
    fontWeight: "900",
  },
});
