import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function FuturisticBackButton({ style }) {
  const navigation = useNavigation();
  const canGoBack = navigation?.canGoBack?.() ?? false;

  if (!canGoBack) return null;

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={styles.btn}
        android_ripple={{ color: "rgba(34,197,94,0.15)" }}
      >
        <Text style={styles.arrow}>‹</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 50,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.28)",
    backgroundColor: "rgba(11,18,32,0.72)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  arrow: {
    color: "#bbf7d0",
    fontSize: 22,
    fontWeight: "900",
    marginTop: -2,
  },
});
