import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import { getTierForScore } from "../constants/tiers";

interface AuraHistoryItemProps {
  score: number;
  roast: string;
  thumbnailUrl?: string;
  timestamp: string;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AuraHistoryItem({
  score,
  roast,
  timestamp,
}: AuraHistoryItemProps) {
  const tier = getTierForScore(score);

  return (
    <View style={styles.row}>
      <View style={[styles.thumbnail, { borderColor: tier.color }]}>
        <Text style={[styles.thumbScore, { color: tier.color }]}>{score}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <View style={[styles.tierBadge, { backgroundColor: tier.color + "25" }]}>
            <Text style={[styles.tierText, { color: tier.color }]}>{tier.name}</Text>
          </View>
          <Text style={styles.time}>{timeAgo(timestamp)}</Text>
        </View>
        <Text style={styles.roast} numberOfLines={2}>
          {roast}
        </Text>
      </View>
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
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: COLORS.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbScore: {
    fontSize: 16,
    fontWeight: "800",
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
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
  time: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  roast: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
