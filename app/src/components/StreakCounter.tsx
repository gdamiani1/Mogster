import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import { useAuthStore } from "../store/authStore";

export default function StreakCounter() {
  const profile = useAuthStore((s) => s.profile);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const streak = profile?.current_streak ?? 0;
  const needsCheck = streak === 0;

  useEffect(() => {
    if (!needsCheck) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [needsCheck, pulseAnim]);

  if (streak > 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.flame}>&#x1F525;</Text>
        <Text style={styles.count}>{streak}</Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[styles.warningContainer, { transform: [{ scale: pulseAnim }] }]}
    >
      <Text style={styles.flame}>&#x1F525;</Text>
      <Text style={styles.warningText}>Don't lose your streak!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 16,
    gap: SPACING.xs,
  },
  flame: {
    fontSize: 18,
  },
  count: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: "800",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    gap: SPACING.xs,
  },
  warningText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
  },
});
