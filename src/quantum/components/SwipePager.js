import React, { useRef } from "react";
import { Animated, PanResponder, Dimensions, Easing } from "react-native";

var W = Dimensions.get("window").width;

/**
 * Balayage horizontal entre pages.
 *
 * Point important : le contenu est un ScrollView, qui reclame le responder
 * des le premier mouvement. On intercepte donc en phase de CAPTURE
 * (onMoveShouldSetPanResponderCapture), qui descend du parent vers l'enfant,
 * et seulement quand le geste est franchement horizontal.
 */
export default function SwipePager(props) {
  var x = useRef(new Animated.Value(0)).current;
  var busy = useRef(false);

  // Le PanResponder n'est cree qu'une fois : il capturerait les callbacks du
  // premier rendu et repartirait toujours du meme indice. On passe donc par
  // une ref rafraichie a chaque rendu.
  var live = useRef(props);
  live.current = props;

  function settle(dir, commit) {
    busy.current = true;
    Animated.timing(x, {
      toValue: dir * -W * 0.4,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(function () {
      commit();
      x.setValue(dir * W * 0.4);
      Animated.spring(x, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 0 })
        .start(function () { busy.current = false; });
    });
  }

  function recenter() {
    Animated.spring(x, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }

  var pan = useRef(
    PanResponder.create({
      // capture : on passe devant le ScrollView enfant
      onMoveShouldSetPanResponderCapture: function (e, g) {
        if (busy.current) return false;
        return Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2;
      },
      onStartShouldSetPanResponderCapture: function () { return false; },
      onPanResponderGrant: function () { x.stopAnimation(); },
      onPanResponderMove: function (e, g) {
        if (busy.current) return;
        var over = Math.abs(g.dx) / W;
        var factor = over < 0.5 ? 0.85 : Math.max(0.35, 0.85 - (over - 0.5) * 0.6);
        x.setValue(g.dx * factor);
      },
      onPanResponderRelease: function (e, g) {
        if (busy.current) return;
        var launched = Math.abs(g.vx) > 0.28;
        var dragged = Math.abs(g.dx) > W * 0.2;
        if ((launched || dragged) && g.dx < 0 && live.current.canNext) {
          return settle(1, function () { live.current.onNext(); });
        }
        if ((launched || dragged) && g.dx > 0 && live.current.canPrev) {
          return settle(-1, function () { live.current.onPrev(); });
        }
        recenter();
      },
      onPanResponderTerminate: recenter,
      onPanResponderTerminationRequest: function () { return false; },
    })
  ).current;

  var fade = x.interpolate({
    inputRange: [-W * 0.5, 0, W * 0.5],
    outputRange: [0.5, 1, 0.5],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      collapsable={false}
      style={{ flex: 1, opacity: fade, transform: [{ translateX: x }] }}
      {...pan.panHandlers}
    >
      {props.children}
    </Animated.View>
  );
}
