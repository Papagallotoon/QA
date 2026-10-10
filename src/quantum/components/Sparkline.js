import React from "react";
import Svg, { Polyline, Polygon, Defs, LinearGradient, Stop } from "react-native-svg";

export default function Sparkline(props) {
  var w = props.width || 46;
  var h = props.height || 22;
  var src = props.history || [];
  if (src.length < 2) return <Svg width={w} height={h} />;
  var step = Math.max(1, Math.floor(src.length / 20));
  var data = src.filter(function (_, i) { return i % step === 0; });
  var lo = Math.min.apply(null, data), hi = Math.max.apply(null, data);
  var span = hi - lo || 1;
  var pts = data.map(function (v, i) {
    return [(i / (data.length - 1)) * w, h - ((v - lo) / span) * (h * 0.86) - h * 0.07];
  });
  var line = pts.map(function (p) { return p[0] + "," + p[1]; }).join(" ");
  var area = line + " " + w + "," + h + " 0," + h;
  var id = "sg" + String(props.seed || "x").replace(/[^a-z0-9]/gi, "");
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={props.color} stopOpacity="0.45" />
          <Stop offset="1" stopColor={props.color} stopOpacity="0.03" />
        </LinearGradient>
      </Defs>
      <Polygon points={area} fill={"url(#" + id + ")"} />
      <Polyline points={line} fill="none" stroke={props.color} strokeWidth="1.4" />
    </Svg>
  );
}
