import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

const LOADING_MESSAGES = [
  "Analyzing your aura fr fr...",
  "Computing the mog differential...",
  "Consulting the sigma oracle...",
  "Calibrating aura sensors...",
  "Running vibe diagnostics...",
  "Cross-referencing the rizz database...",
  "Decoding your skibidi wavelength...",
  "Checking if you're HIM...",
];

export default function LoadingAura() {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle loading messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Pulsing purple glow animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, { opacity: pulseAnim }]} />
      <Text style={styles.message}>{LOADING_MESSAGES[messageIndex]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    padding: 32,
  },
  glow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#7C3AED",
    marginBottom: 32,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  message: {
    color: "#A78BFA",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
