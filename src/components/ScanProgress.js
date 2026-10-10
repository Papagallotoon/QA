// src/components/ScanProgress.js
import React from "react";
import { View, Text, Animated } from "react-native";

export default function ScanProgress({ done, total, label }) {
  const percentage = (done / total) * 100;

  return (
    <View style={styles.container}>
      <Text>{label}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.fill, { width: percentage + "%" }]} />
      </View>
      <Text>{done} / {total}</Text>
    </View>
  );
}