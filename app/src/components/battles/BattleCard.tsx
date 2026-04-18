import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, SPACING, FONTS } from "../../constants/theme";

interface Props {
  kind: "active-incoming" | "active-outgoing" | "history";
  opponentName: string;
  sigmaPath?: string;
  timeText?: string;
  isWin?: boolean;
  margin?: string;
  onPress: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}

function formatPath(path?: string): string {
  if (!path) return "";
  return path.replace(/_/g, " ").toUpperCase();
}

export default function BattleCard(props: Props) {
  const {
    kind,
    opponentName,
    sigmaPath,
    timeText,
    isWin,
    margin,
    onPress,
    onAccept,
    onDecline,
  } = props;

  const isIncoming = kind === "active-incoming";
  const isOutgoing = kind === "active-outgoing";
  const isHistory = kind === "history";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Left rail: WL badge or arrow */}
      {isHistory && (
        <View style={[styles.railBadge, isWin ? styles.railWin : styles.railLoss]}>
          <Text style={[styles.railBadgeText, { color: isWin ? COLORS.bg : COLORS.textPrimary }]}>
            {isWin ? "W" : "L"}
          </Text>
        </View>
      )}
      {isIncoming && (
        <View style={styles.railPending}>
          <Text style={styles.railPendingText}>⚔</Text>
        </View>
      )}
      {isOutgoing && (
        <View style={styles.railOutgoing}>
          <Text style={styles.railOutgoingText}>→</Text>
        </View>
      )}

      {/* Main info */}
      <View style={styles.info}>
        <View style={styles.topLine}>
          <Text style={styles.kind}>
            {isIncoming && "INCOMING"}
            {isOutgoing && "OUTGOING"}
            {isHistory && (isWin ? "VICTORY" : "DEFEAT")}
          </Text>
          {isHistory && margin && (
            <View style={styles.marginBadge}>
              <Text style={styles.marginText}>{margin}</Text>
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {isIncoming && `@${opponentName}`}
          {isOutgoing && `@${opponentName}`}
          {isHistory && `VS @${opponentName}`}
        </Text>

        <View style={styles.metaRow}>
          {sigmaPath && <Text style={styles.meta}>{formatPath(sigmaPath)}</Text>}
          {sigmaPath && timeText && <Text style={styles.metaDot}>·</Text>}
          {timeText && <Text style={styles.meta}>{timeText}</Text>}
        </View>
      </View>

      {/* Right: action buttons or chevron */}
      {isIncoming ? (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onAccept} style={styles.acceptBtn} activeOpacity={0.8}>
            <Text style={styles.acceptText}>ACCEPT</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDecline} style={styles.declineBtn} activeOpacity={0.8}>
            <Text style={styles.declineText}>DECLINE</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.chevron}>→</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Left rail
  railBadge: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    borderWidth: 1,
  },
  railWin: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  railLoss: {
    backgroundColor: "rgba(255, 59, 48, 0.12)",
    borderColor: COLORS.blood,
  },
  railBadgeText: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: -1,
  },
  railPending: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 214, 10, 0.12)",
  },
  railPendingText: {
    fontSize: 22,
    color: COLORS.primary,
  },
  railOutgoing: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  railOutgoingText: {
    fontFamily: FONTS.monoBold,
    fontSize: 24,
    color: COLORS.textMuted,
  },

  // Info
  info: {
    flex: 1,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  kind: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  marginBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  marginText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.bg,
    letterSpacing: 1.5,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 24,
    includeFontPadding: false,
    paddingTop: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  meta: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
  },
  metaDot: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.textMuted,
  },

  // Right
  actions: {
    gap: 4,
    marginLeft: SPACING.sm,
  },
  acceptBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
  },
  acceptText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.bg,
    letterSpacing: 1.5,
  },
  declineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  declineText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  chevron: {
    fontFamily: FONTS.monoBold,
    fontSize: 18,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
});
