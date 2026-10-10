// src/screens/WatchlistScreen.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function WatchlistScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Watchlist - Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 18,
  },
});