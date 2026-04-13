import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING } from "../constants/theme";
import { useAuthStore } from "../store/authStore";

interface DailyChallenge {
  title: string;
  description: string;
  sigma_path: string | null;
  bonus_multiplier: number;
  challenge_date: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function DailyChallengeBanner() {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const setPath = useAuthStore((s) => s.setPath);

  useEffect(() => {
    fetch(`${API_URL}/daily/today`)
      .then((r) => r.json())
      .then((data) => setChallenge(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!challenge) return null;

  const handlePress = () => {
    if (challenge.sigma_path) {
      setPath(challenge.sigma_path);
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{challenge.title}</Text>
          {challenge.bonus_multiplier > 1 && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>
                {challenge.bonus_multiplier}x Aura!
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.description}>{challenge.description}</Text>
        {challenge.sigma_path && (
          <Text style={styles.tapHint}>Tap to select this path</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: SPACING.lg,
    alignItems: "center",
  },
  banner: {
    borderRadius: 16,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  bonusBadge: {
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginLeft: SPACING.sm,
  },
  bonusText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: "800",
  },
  description: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    lineHeight: 20,
  },
  tapHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: SPACING.xs,
    fontStyle: "italic",
  },
});
