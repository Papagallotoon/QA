import React from "react";
import { View, Text } from "react-native";
import Svg, { Polyline, Polygon, Line, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { C, T } from "../theme";

export default function PriceChart(props) {
  var w = props.width;
  var h = 84;
  var split = w * 0.62;
  var color = props.color;
  var hist = props.history || [];
  if (hist.length < 2) return <View style={{ height: h }} />;

  var lo = Math.min.apply(null, hist);
  var hi = Math.max.apply(null, hist);
  var p05 = props.p05, p95 = props.p95;
  if (p05 != null && !isNaN(p05)) lo = Math.min(lo, p05);
  if (p95 != null && !isNaN(p95)) hi = Math.max(hi, p95);
  var span = hi - lo || 1;
  var y = function (v) { return h - ((v - lo) / span) * h * 0.92 - h * 0.04; };

  var pts = hist.map(function (v, i) { return [(i / (hist.length - 1)) * split, y(v)]; });
  var line = pts.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
  var area = line + " " + split + "," + h + " 0," + h;
  var lastPt = pts[pts.length - 1];
  var cone = lastPt[0] + "," + lastPt[1] + " " + w + "," + y(p95 != null ? p95 : hi) + " " + w + "," + y(p05 != null ? p05 : lo);

  return (
    <View>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="pcA" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Polygon points={area} fill="url(#pcA)" />
        <Polyline points={line} fill="none" stroke={color} strokeWidth="1.6" />
        <Polygon points={cone} fill={color} fillOpacity="0.16" />
        <Line x1={split} y1="0" x2={split} y2={h} stroke="rgba(232,234,236,0.22)" strokeWidth="1" />
        <Circle cx={split} cy={lastPt[1]} r="4" fill={C.text} />
      </Svg>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: C.borderSoft }}>
        <Text style={[T.mono(9, "500"), { color: C.dimmer, letterSpacing: 1 }]}>{hist.length + " SEANCES"}</Text>
        <Text style={[T.mono(9, "500"), { color: C.dim, letterSpacing: 1 }]}>AUJOURD'HUI</Text>
        <Text style={[T.mono(9, "500"), { color: color, letterSpacing: 1 }]}>PROJECTION</Text>
      </View>
    </View>
  );
}
