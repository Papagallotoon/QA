import React from "react";
import { View, Pressable, Text } from "react-native";
import { C, T } from "../theme";

export default function PageDots(props) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 5, gap: 5 }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
        {props.items.map(function (id, i) {
          var on = i === props.activeIndex;
          return (
            <Pressable key={id} onPress={function () { props.onSelect(id); }} hitSlop={10}>
              <View style={{
                width: on ? 18 : 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: on ? C.ringUp : "rgba(232,234,236,0.2)",
              }} />
            </Pressable>
          );
        })}
      </View>
      {props.label ? (
        <Text style={[T.mono(8.5, "500"), { color: "rgba(232,234,236,0.3)", letterSpacing: 1 }]}>
          {props.label}
        </Text>
      ) : null}
    </View>
  );
}
