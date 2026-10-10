// src/components/TradingViewChart.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_HEIGHT = SCREEN_WIDTH * 0.8; // proportionnel à l'écran

// convertit "AIR.PA" -> symbole TradingView ("EURONEXT:AIR")
function toTradingViewSymbol(symbol) {
  if (!symbol) return "EURONEXT:AIR";

  // si déjà au format "XPAR:AIR" ou "EURONEXT:MC"
  if (symbol.includes(":")) return symbol;

  if (symbol.endsWith(".PA")) {
    const base = symbol.replace(".PA", "");
    return `EURONEXT:${base}`;
  }

  return symbol;
}

export default function TradingViewChart({ symbol }) {
  const tvSymbol = toTradingViewSymbol(symbol);

  // ⛔ WebView ne supporte pas la plateforme "web"
  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, styles.webFallback]}>
        <Text style={styles.webText}>
          Le graphique TradingView n’est pas disponible dans la
          version web de l’app.
        </Text>
        <Text style={styles.webTextSmall}>
          Teste sur un build iOS / Android pour voir le chart
          interactif complet.
        </Text>
      </View>
    );
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #020617;
            width: 100%;
            height: 100%;
          }
          #tvchart {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div id="tvchart"></div>
        <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
        <script type="text/javascript">
          new TradingView.widget({
            "container_id": "tvchart",
            "autosize": true,
            "symbol": "${tvSymbol}",
            "interval": "60",
            "timezone": "Europe/Paris",
            "theme": "dark",
            "style": "1",
            "locale": "fr",
            "toolbar_bg": "#020617",
            "hide_top_toolbar": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": false,
            "save_image": false,
            "calendar": false,
            "studies": [],
            "withdateranges": true,
            "hide_volume": false
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        style={{ backgroundColor: "#020617" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: CHART_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#020617",
  },
  webFallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  webText: {
    color: "#e5e7eb",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },
  webTextSmall: {
    color: "#9ca3af",
    fontSize: 11,
    textAlign: "center",
  },
});
