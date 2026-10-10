import { Platform } from "react-native";

export const C = {
  bg: "#0a0c10",
  bgTop: "#16202b",
  card: "rgba(255,255,255,0.045)",
  cardSolid: "#11161d",
  border: "rgba(255,255,255,0.08)",
  borderSoft: "rgba(255,255,255,0.06)",
  text: "#e8eaec",
  dim: "rgba(232,234,236,0.45)",
  dimmer: "rgba(232,234,236,0.32)",
  up: "#5fe3a1",
  down: "#f0705f",
  flat: "rgba(232,234,236,0.6)",
  ringUp: "#4fdd9a",
  ringDown: "#e05c4b",
  ink: "#07120c",
};

export const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

export const T = {
  mono: (size, weight) => ({ fontFamily: MONO, fontSize: size, fontWeight: weight || "600" }),
  sans: (size, weight) => ({ fontSize: size, fontWeight: weight || "500" }),
};
