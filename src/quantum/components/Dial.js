import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export default function Dial(props) {
  var size = props.size || 178;
  var stroke = props.stroke || 17;
  var pct = Math.max(0, Math.min(100, props.pct || 0));
  var r = (size - stroke) / 2;
  var c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.09)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={props.color} strokeWidth={stroke} fill="none"
          strokeDasharray={(c * pct) / 100 + " " + c}
          transform={"rotate(-90 " + size / 2 + " " + size / 2 + ")"}
        />
      </Svg>
      {props.children}
    </View>
  );
}
