import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, FONTS } from "../../src/constants/theme";
import FriendsSection from "../../src/components/battles/FriendsSection";
import BattlesSection from "../../src/components/battles/BattlesSection";

type Tab = "battles" | "friends";

export default function BattlesScreen() {
  const [tab, setTab] = useState<Tab>("battles");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Editorial header */}
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>SECTION 04 · THE RING</Text>
        </View>
        <Text style={styles.title}>BATTLES.</Text>
        <Text style={styles.subtitle}>LINK UP · CHALLENGE · GET MOGGED</Text>
      </View>

      {/* Segmented control */}
      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.segment, tab === "battles" && styles.segmentActive]}
          onPress={() => setTab("battles")}
          activeOpacity={0.75}
        >
          <Text style={[styles.segmentText, tab === "battles" && styles.segmentTextActive]}>
            ⚔ BATTLES
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, tab === "friends" && styles.segmentActive]}
          onPress={() => setTab("friends")}
          activeOpacity={0.75}
        >
          <Text style={[styles.segmentText, tab === "friends" && styles.segmentTextActive]}>
            FRIENDS
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "battles" ? <BattlesSection /> : <FriendsSection />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 214, 10, 0.12)",
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  eyebrowLine: {
    width: 20,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  eyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 64,
    lineHeight: 74,
    includeFontPadding: false,
    paddingTop: 8,
    color: COLORS.textPrimary,
    letterSpacing: -2,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },

  segmented: {
    flexDirection: "row",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.8,
  },
  segmentTextActive: { color: COLORS.bg },
});
