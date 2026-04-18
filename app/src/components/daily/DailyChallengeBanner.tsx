import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONTS } from "../../constants/theme";
import { API_URL } from "../../lib/api";

interface Challenge {
  title: string;
  description: string;
  sigma_path: string | null;
  bonus_multiplier: number;
  challenge_date: string;
}

interface Props {
  completed?: boolean;
}

export function DailyChallengeBanner({ completed = false }: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/daily/today`)
      .then((r) => r.json())
      .then((data: Challenge) => {
        if (!cancelled) setChallenge(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!challenge) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.badge}>+{challenge.bonus_multiplier}× AURA</Text>
        {completed && <Text style={styles.completed}>✓ COMPLETED</Text>}
      </View>
      <Text style={styles.title}>{challenge.title.toUpperCase()}</Text>
      <Text style={styles.desc}>{challenge.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badge: {
    fontFamily: FONTS.monoBold,
    color: COLORS.primary,
    fontSize: 10,
    letterSpacing: 2.5,
  },
  completed: {
    fontFamily: FONTS.monoBold,
    color: COLORS.mint,
    fontSize: 10,
    letterSpacing: 2,
  },
  title: {
    fontFamily: FONTS.display,
    color: COLORS.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    includeFontPadding: false,
    paddingTop: 4,
  },
  desc: {
    fontFamily: FONTS.mono,
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
});
