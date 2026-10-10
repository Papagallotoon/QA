// src/components/QuantumLoader.js
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";

export default function QuantumLoader({ message = "Analyse en cours", progress = null }) {
  const spin1 = useRef(new Animated.Value(0)).current;
  const spin2 = useRef(new Animated.Value(0)).current;
  const spin3 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Rotation des cercles
    const rotation1 = Animated.loop(
      Animated.timing(spin1, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const rotation2 = Animated.loop(
      Animated.timing(spin2, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const rotation3 = Animated.loop(
      Animated.timing(spin3, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Pulse du centre
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    // Glow effect
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
      ])
    );

    rotation1.start();
    rotation2.start();
    rotation3.start();
    pulseAnim.start();
    glowAnim.start();

    return () => {
      rotation1.stop();
      rotation2.stop();
      rotation3.stop();
      pulseAnim.stop();
      glowAnim.stop();
    };
  }, []);

  const rotate1 = spin1.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const rotate2 = spin2.interpolate({
    inputRange: [0, 1],
    outputRange: ["360deg", "0deg"],
  });

  const rotate3 = spin3.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.container}>
      <View style={styles.loaderWrapper}>
        {/* Cercle externe */}
        <Animated.View
          style={[
            styles.circle,
            styles.circle1,
            { transform: [{ rotate: rotate1 }] },
          ]}
        />

        {/* Cercle moyen */}
        <Animated.View
          style={[
            styles.circle,
            styles.circle2,
            { transform: [{ rotate: rotate2 }] },
          ]}
        />

        {/* Cercle interne */}
        <Animated.View
          style={[
            styles.circle,
            styles.circle3,
            { transform: [{ rotate: rotate3 }] },
          ]}
        />

        {/* Centre avec pulse */}
        <Animated.View
          style={[
            styles.center,
            {
              transform: [{ scale: pulse }],
              opacity: glowOpacity,
            },
          ]}
        >
          <Text style={styles.centerIcon}>⚡</Text>
        </Animated.View>

        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowOpacity,
            },
          ]}
        />
      </View>

      {/* Message */}
      <Text style={styles.message}>{message}</Text>

      {/* Progress bar si fourni */}
      {progress !== null && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      )}

      {/* Dots animés */}
      <LoadingDots />
    </View>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createDotAnimation(dot1, 0);
    const anim2 = createDotAnimation(dot2, 200);
    const anim3 = createDotAnimation(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  const getDotStyle = (dot) => ({
    opacity: dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
      <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
      <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },

  loaderWrapper: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  circle: {
    position: "absolute",
    borderWidth: 3,
    borderRadius: 999,
    borderStyle: "solid",
  },

  circle1: {
    width: 140,
    height: 140,
    borderColor: "transparent",
    borderTopColor: "#22c55e",
    borderRightColor: "#22c55e",
  },

  circle2: {
    width: 100,
    height: 100,
    borderColor: "transparent",
    borderBottomColor: "#3b82f6",
    borderLeftColor: "#3b82f6",
  },

  circle3: {
    width: 60,
    height: 60,
    borderColor: "transparent",
    borderTopColor: "#a855f7",
    borderRightColor: "#a855f7",
  },

  center: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },

  centerIcon: {
    fontSize: 24,
    color: "#ffffff",
  },

  glow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#22c55e",
    opacity: 0.1,
  },

  message: {
    marginTop: 24,
    color: "#e5e7eb",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: "#1e293b",
    borderRadius: 2,
    marginTop: 16,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 2,
  },

  dotsContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
});