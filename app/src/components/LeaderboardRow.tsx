import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import { getTierForScore } from "../constants/tiers";

interface LeaderboardRowProps {
  rank: number;
  username: string;
  peakAura: number;
  avatarColor?: string;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function getRankStyle(rank: number) {
  if (rank === 1) return { borderColor: "#FFD700", bg: "#FFD70020" };
  if (rank === 2) return { borderColor: "#C0C0C0", bg: "#C0C0C020" };
  if (rank === 3) return { borderColor: "#CD7F32", bg: "#CD7F3220" };
  return { borderColor: COLORS.border, bg: "transparent" };
}

export default function LeaderboardRow({
  rank,
  username,
  peakAura,
  avatarColor,
}: LeaderboardRowProps) {
  const tier = getTierForScore(peakAura);
  const rankStyle = getRankStyle(rank);
  const color = avatarColor || COLORS.primary;

  return (
    <View style={[styles.row, { borderColor: rankStyle.borderColor, backgroundColor: rankStyle.bg }]}>
      <Text style={[styles.rank, rank <= 3 && { color: rankStyle.borderColor, fontWeight: "900" }]}>
        {rank}
      </Text>

      <View style={[styles.avatar, { backgroundColor: color + "30", borderColor: color }]}>
        <Text style={[styles.avatarText, { color }]}>{getInitials(username)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.username} numberOfLines={1}>
          {username}
        </Text>
        <View style={styles.tierRow}>
          <View style={[styles.tierBadge, { backgroundColor: tier.color + "25" }]}>
            <Text style={[styles.tierText, { color: tier.color }]}>{tier.name}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.score}>{peakAura}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: COLORS.bgCard,
  },
  rank: {
    width: 28,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SPACING.sm,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  username: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  tierRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  tierBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 11,
    fontWeight: "700",
  },
  score: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
    marginLeft: SPACING.sm,
  },
});
