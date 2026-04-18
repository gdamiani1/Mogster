import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SPACING, FONTS } from "../../src/constants/theme";
import { requestPermissionsAndRegister } from "../../src/lib/notifications";
import { useAuthStore } from "../../src/store/authStore";

const PRIMER_DECLINED_KEY = "notification_primer_declined_at";

export default function NotificationsPrimer() {
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const onAllow = async () => {
    await requestPermissionsAndRegister();
    await completeOnboarding();
    // Route guard in _layout.tsx reactively moves to (tabs)
  };

  const onLater = async () => {
    await AsyncStorage.setItem(PRIMER_DECLINED_KEY, new Date().toISOString());
    await completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.inner}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>ONE LAST THING</Text>
        </View>

        <Text style={styles.headline}>AURA{"\n"}NEEDS{"\n"}DAILY.</Text>

        <Text style={styles.pitch}>
          A quick nudge so your streak doesn't die — and you never miss today's challenge bonus.
        </Text>

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.primary} onPress={onAllow} activeOpacity={0.85}>
          <Text style={styles.primaryText}>TURN ON NOTIFICATIONS →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={onLater} activeOpacity={0.7}>
          <Text style={styles.secondaryText}>MAYBE LATER</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
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
  headline: {
    fontFamily: FONTS.display,
    fontSize: 72,
    lineHeight: 78,
    includeFontPadding: false,
    paddingTop: 8,
    color: COLORS.textPrimary,
    letterSpacing: -2.5,
    marginBottom: SPACING.lg,
  },
  pitch: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  spacer: { flex: 1 },
  primary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  primaryText: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: COLORS.bg,
    letterSpacing: 2.5,
  },
  secondary: {
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2.5,
  },
});
