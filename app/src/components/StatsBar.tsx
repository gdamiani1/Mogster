import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../constants/theme";

interface StatsBarProps {
  peakAura: number;
  streak: number;
  totalWins: number;
}

export default function StatsBar({ peakAura, streak, totalWins }: StatsBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.value}>{peakAura}</Text>
        <Text style={styles.label}>Peak Aura</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.value}>
          {streak} <Text style={styles.flame}>{"🔥"}</Text>
        </Text>
        <Text style={styles.label}>Streak</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.value}>{totalWins}</Text>
        <Text style={styles.label}>Total W's</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  value: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  flame: {
    fontSize: 18,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
});
