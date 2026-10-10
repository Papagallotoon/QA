import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import QuantumApp from "./src/quantum/QuantumApp";

export default function App() {
  return (
    <SafeAreaProvider>
      <QuantumApp />
    </SafeAreaProvider>
  );
}
