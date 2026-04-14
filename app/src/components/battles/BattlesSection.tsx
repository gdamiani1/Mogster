import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";

// Stub — implemented fully in Task 9
export default function BattlesSection() {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>Battles coming in Task 9</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { color: COLORS.textMuted, fontSize: 14, padding: SPACING.lg },
});
