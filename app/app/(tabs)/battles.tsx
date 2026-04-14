import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING } from "../../src/constants/theme";
import FriendsSection from "../../src/components/battles/FriendsSection";
import BattlesSection from "../../src/components/battles/BattlesSection";

type Tab = "battles" | "friends";

export default function BattlesScreen() {
  const [tab, setTab] = useState<Tab>("battles");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.segment, tab === "battles" && styles.segmentActive]}
          onPress={() => setTab("battles")}
        >
          <Text style={[styles.segmentText, tab === "battles" && styles.segmentTextActive]}>⚔ Battles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, tab === "friends" && styles.segmentActive]}
          onPress={() => setTab("friends")}
        >
          <Text style={[styles.segmentText, tab === "friends" && styles.segmentTextActive]}>Friends</Text>
        </TouchableOpacity>
      </View>
      {tab === "battles" ? <BattlesSection /> : <FriendsSection />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  segmented: {
    flexDirection: "row",
    gap: SPACING.xs,
    margin: SPACING.md,
    padding: 3,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { color: COLORS.textMuted, fontSize: 14, fontWeight: "700" },
  segmentTextActive: { color: "#fff" },
});
