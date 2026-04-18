import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONTS } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";

/**
 * Editorial boxer record card — W · L · D + streak.
 * Displayed at the top of the Battles section.
 */
export default function RecordCard() {
  const { profile } = useAuthStore();
  const wins = (profile as any)?.battle_wins ?? 0;
  const losses = (profile as any)?.battle_losses ?? 0;
  const draws = (profile as any)?.battle_draws ?? 0;
  const streak = (profile as any)?.battle_streak ?? 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <View style={styles.labelLine} />
        <Text style={styles.label}>YOUR RECORD</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.stats}>
          <Stat value={wins} label="W" color={COLORS.mint} />
          <View style={styles.divider} />
          <Stat value={losses} label="L" color={COLORS.blood} />
          <View style={styles.divider} />
          <Stat value={draws} label="D" color={COLORS.textMuted} />
        </View>

        {streak !== 0 && (
          <View style={[
            styles.streakBadge,
            streak > 0 ? styles.streakWin : styles.streakLoss,
          ]}>
            <Text style={[
              styles.streakText,
              { color: streak > 0 ? COLORS.bg : COLORS.blood },
            ]}>
              {streak > 0 ? `★ ${streak}W STREAK` : `▼ ${Math.abs(streak)}L SKID`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>
        {String(value).padStart(2, "0")}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  labelLine: {
    width: 18,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  label: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
  },

  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },

  stats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.border,
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 56,
    lineHeight: 64,
    paddingTop: 6,
    letterSpacing: -2,
    includeFontPadding: false,
  },
  statLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: 4,
  },

  streakBadge: {
    marginTop: SPACING.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "center",
    borderWidth: 1,
  },
  streakWin: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  streakLoss: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderColor: COLORS.blood,
  },
  streakText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 2,
  },
});
