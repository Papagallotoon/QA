// src/components/YahooCandleChart.js
import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
} from "react-native";
import Svg, {
  Line,
  Rect,
  Text as SvgText,
  Polyline,
  Path,
  Circle,
} from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_HEIGHT = 240;
const TOP_INFO_HEIGHT = 22; // bandeau OHLC en haut

// Timeframes (avec 1J & 5J)
const TIMEFRAMES = [
  { key: "1D", label: "1J", bars: 1 },
  { key: "5D", label: "5J", bars: 5 },
  { key: "1M", label: "1M", bars: 21 },
  { key: "3M", label: "3M", bars: 63 },
  { key: "6M", label: "6M", bars: 126 },
  { key: "1Y", label: "1A", bars: 252 },
  { key: "ALL", label: "Tout", bars: null },
];

// SMA continue qui s'adapte à la période
function computeSMA(data, period) {
  if (!data || !data.length) return [];

  const result = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    const close = data[i].close ?? 0;
    sum += close;

    if (i >= period) {
      const oldClose = data[i - period].close ?? 0;
      sum -= oldClose;
      result.push(sum / period);
    } else {
      // warm-up : moyenne sur (i+1) => courbe complète dès le début
      result.push(sum / (i + 1));
    }
  }

  return result;
}

// Format de l’étiquette X (abscisses)
function formatXLabel(candle, index) {
  const raw =
    candle?.date ??
    candle?.time ??
    candle?.timestamp ??
    null;

  if (raw) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${day}/${month}`;
    }
    return String(raw).slice(0, 10);
  }

  return `#${(index ?? 0) + 1}`;
}

export default function YahooCandleChart({ candles = [] }) {
  const [timeframe, setTimeframe] = useState("3M");
  const [mode, setMode] = useState("candle"); // "candle" | "line"
  const [hoverIndex, setHoverIndex] = useState(null);
  const [chartWidth, setChartWidth] = useState(SCREEN_WIDTH - 32);

  // Filtrage Timeframe + calcul des SMA
  const { data, minPrice, maxPrice, sma20, sma50 } = useMemo(() => {
    if (!candles || !candles.length) {
      return {
        data: [],
        minPrice: 0,
        maxPrice: 1,
        sma20: [],
        sma50: [],
      };
    }

    const tf = TIMEFRAMES.find((t) => t.key === timeframe);
    let slice = candles;
    if (tf && tf.bars && candles.length > tf.bars) {
      slice = candles.slice(-tf.bars);
    }

    const SMA20 = computeSMA(slice, 20);
    const SMA50 = computeSMA(slice, 50);

    let minP = Number.POSITIVE_INFINITY;
    let maxP = Number.NEGATIVE_INFINITY;

    slice.forEach((c) => {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
    });

    [...SMA20, ...SMA50].forEach((v) => {
      if (v == null) return;
      if (v < minP) minP = v;
      if (v > maxP) maxP = v;
    });

    const padding = (maxP - minP) * 0.05 || 1;
    minP -= padding;
    maxP += padding;

    return {
      data: slice,
      minPrice: minP,
      maxPrice: maxP,
      sma20: SMA20,
      sma50: SMA50,
    };
  }, [candles, timeframe]);

  if (!candles || !candles.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Pas assez de données pour afficher un graphique.
        </Text>
      </View>
    );
  }

  const height = CHART_HEIGHT;
  const n = data.length || 1;
  const stepX = chartWidth / Math.max(n - 1, 1);
  const candleWidth = Math.max(stepX * 0.4, 3);

  const priceToY = (price) => {
    const t = (price - minPrice) / (maxPrice - minPrice || 1);
    const inverted = 1 - t;
    // graphique décalé sous la barre OHLC
    return TOP_INFO_HEIGHT + inverted * (height - TOP_INFO_HEIGHT - 12);
  };

  const levelsY = [minPrice, (minPrice + maxPrice) / 2, maxPrice];

  const linePoints = data
    .map((c, i) => `${i * stepX},${priceToY(c.close)}`)
    .join(" ");

  const buildSMAPath = (smaArr) => {
    let d = "";
    smaArr.forEach((value, i) => {
      if (value == null) return;
      const x = i * stepX;
      const y = priceToY(value);
      d += d ? ` L ${x} ${y}` : `M ${x} ${y}`;
    });
    return d;
  };

  const sma20Path = buildSMAPath(sma20);
  const sma50Path = buildSMAPath(sma50);

  const xTickIndices = useMemo(() => {
    if (!n) return [];
    const idxs = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
    return [...new Set(idxs.filter((i) => i >= 0 && i < n))].sort(
      (a, b) => a - b
    );
  }, [n]);

  const hoveredCandle =
    hoverIndex != null && hoverIndex >= 0 && hoverIndex < n
      ? data[hoverIndex]
      : null;

  const handleTouch = (evt) => {
    const x = evt.nativeEvent.locationX;
    const idx = Math.round(x / stepX);
    const clamped = Math.max(0, Math.min(n - 1, idx));
    setHoverIndex(clamped);
  };

  return (
    <View>
      {/* CONTROLES */}
      <View style={styles.controlsRow}>
        <View style={styles.timeframeRow}>
          {TIMEFRAMES.map((tf) => (
            <TouchableOpacity
              key={tf.key}
              style={[
                styles.timeframeChip,
                timeframe === tf.key && styles.timeframeChipActive,
              ]}
              onPress={() => setTimeframe(tf.key)}
            >
              <Text
                style={[
                  styles.timeframeText,
                  timeframe === tf.key && styles.timeframeTextActive,
                ]}
              >
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Switch Bougies / Ligne */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === "candle" && styles.modeButtonActive,
            ]}
            onPress={() => setMode("candle")}
          >
            <Text
              style={[
                styles.modeText,
                mode === "candle" && styles.modeTextActive,
              ]}
            >
              Bougies
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === "line" && styles.modeButtonActive,
            ]}
            onPress={() => setMode("line")}
          >
            <Text
              style={[
                styles.modeText,
                mode === "line" && styles.modeTextActive,
              ]}
            >
              Ligne
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* GRAPHIQUE + couche tactile */}
      <View
        style={styles.container}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w && w !== chartWidth) {
            setChartWidth(w);
          }
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        onResponderRelease={() => setHoverIndex(null)}
      >
        <Svg width={chartWidth} height={height}>
          {/* Bandeau OHLC + date en haut quand on touche */}
          {hoveredCandle && (
            <>
              <Rect
                x={0}
                y={0}
                width={chartWidth}
                height={TOP_INFO_HEIGHT}
                fill="#0b1120"
                opacity={0.95}
              />
              <SvgText x={8} y={15} fill="#e5e7eb" fontSize="11">
                {formatXLabel(hoveredCandle, hoverIndex)}{"  "}
                O:{hoveredCandle.open.toFixed(2)}{"  "}
                H:{hoveredCandle.high.toFixed(2)}{"  "}
                L:{hoveredCandle.low.toFixed(2)}{"  "}
                C:{hoveredCandle.close.toFixed(2)}
              </SvgText>
            </>
          )}

          {/* GRILLE + Axe Y (gauche & droite) */}
          {levelsY.map((lvl, idx) => {
            const y = priceToY(lvl);
            return (
              <React.Fragment key={`y-${idx}`}>
                <Line
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#1f2933"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                {/* Label gauche */}
                <SvgText x={4} y={y - 2} fill="#64748b" fontSize="10">
                  {lvl.toFixed(2)}
                </SvgText>
                {/* Label droite */}
                <SvgText
                  x={chartWidth - 4}
                  y={y - 2}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                >
                  {lvl.toFixed(2)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* MODE LIGNE */}
          {mode === "line" && (
            <Polyline
              points={linePoints}
              fill="none"
              stroke="#4ade80"
              strokeWidth="2"
            />
          )}

          {/* MODE BOUGIES */}
          {mode === "candle" &&
            data.map((candle, i) => {
              const x = i * stepX;
              const openY = priceToY(candle.open);
              const closeY = priceToY(candle.close);
              const highY = priceToY(candle.high);
              const lowY = priceToY(candle.low);

              const isBull = candle.close >= candle.open;
              const color = isBull ? "#4ade80" : "#fb7185";

              const bodyTop = Math.min(openY, closeY);
              const bodyBottom = Math.max(openY, closeY);
              const bodyHeight = Math.max(bodyBottom - bodyTop, 2);

              return (
                <React.Fragment key={i}>
                  <Line
                    x1={x}
                    y1={highY}
                    x2={x}
                    y2={lowY}
                    stroke={color}
                    strokeWidth={1.2}
                  />
                  <Rect
                    x={x - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={color}
                    rx={2}
                  />
                </React.Fragment>
              );
            })}

          {/* SMA 20 — vert */}
          {sma20Path && (
            <Path
              d={sma20Path}
              stroke="#22c55e"
              strokeWidth={2}
              fill="none"
            />
          )}

          {/* SMA 50 — orange */}
          {sma50Path && (
            <Path
              d={sma50Path}
              stroke="#fb923c"
              strokeWidth={2}
              fill="none"
            />
          )}

          {/* Axe X : quelques labels de date */}
          {xTickIndices.map((idx) => {
            const x = idx * stepX;
            const label = formatXLabel(data[idx], idx);
            return (
              <React.Fragment key={`x-${idx}`}>
                <Line
                  x1={x}
                  y1={height - 14}
                  x2={x}
                  y2={height - 10}
                  stroke="#1f2937"
                  strokeWidth={1}
                />
                <SvgText
                  x={x}
                  y={height - 2}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* CROSSHAIR + prix à droite */}
          {hoveredCandle && (() => {
            const x = hoverIndex * stepX;
            const y = priceToY(hoveredCandle.close);
            const priceLabel = hoveredCandle.close.toFixed(2);

            const boxWidth = 68;
            const boxHeight = 18;

            const minY = TOP_INFO_HEIGHT + 6;
            let boxY = y - boxHeight / 2;
            if (boxY < minY) boxY = minY;
            if (boxY + boxHeight > height - 6) {
              boxY = height - boxHeight - 6;
            }

            const boxX = chartWidth - boxWidth - 4;

            return (
              <>
                <Line
                  x1={x}
                  y1={TOP_INFO_HEIGHT}
                  x2={x}
                  y2={height}
                  stroke="#e5e7eb"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                />
                <Circle cx={x} cy={y} r={4} fill="#e5e7eb" />
                <Rect
                  x={boxX}
                  y={boxY}
                  width={boxWidth}
                  height={boxHeight}
                  rx={4}
                  fill="#0b1120"
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                <SvgText
                  x={boxX + boxWidth / 2}
                  y={boxY + boxHeight / 2 + 4}
                  fill="#e5e7eb"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {priceLabel}
                </SvgText>
              </>
            );
          })()}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsRow: {
    marginBottom: 6,
  },
  timeframeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  timeframeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginRight: 6,
    marginBottom: 4,
  },
  timeframeChipActive: {
    backgroundColor: "#22c55e22",
    borderColor: "#22c55e",
  },
  timeframeText: {
    color: "#9ca3af",
    fontSize: 10,
  },
  timeframeTextActive: {
    color: "#bbf7d0",
    fontWeight: "700",
  },

  modeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  modeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginLeft: 6,
  },
  modeButtonActive: {
    backgroundColor: "#22c55e22",
    borderColor: "#22c55e",
  },
  modeText: {
    color: "#9ca3af",
    fontSize: 10,
  },
  modeTextActive: {
    color: "#bbf7d0",
    fontWeight: "700",
  },

  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#020617",
    overflow: "hidden",
  },
  emptyContainer: {
    height: CHART_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 12,
    textAlign: "center",
  },
});
