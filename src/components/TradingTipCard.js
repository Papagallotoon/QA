// src/components/TradingTipCard.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";

const TIPS = [
  { title: "Risk Management", tip: "Ne risque jamais plus de 1-2% par trade" },
  // ... 14 autres astuces
];

export default function TradingTipCard() {
  const [tip, setTip] = useState(TIPS[0]);

  return (
    <View style={styles.card}>
      <Text>{tip.title}</Text>
      <Text>{tip.tip}</Text>
      <TouchableOpacity onPress={() => setTip(TIPS[Math.random() * TIPS.length])}>
        <Text>Astuce suivante</Text>
      </TouchableOpacity>
    </View>
  );
}