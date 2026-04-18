import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { COLORS, SPACING, FONTS } from "../../constants/theme";
import { authedFetch } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import RecordCard from "./RecordCard";
import BattleCard from "./BattleCard";

interface ActiveBattle {
  id: string;
  challenger_id: string;
  opponent_id: string;
  sigma_path: string;
  expires_at: string;
  created_at: string;
  challenger?: { id: string; username: string } | null;
  opponent?: { id: string; username: string } | null;
}

interface HistoryBattle {
  id: string;
  challenger_id: string;
  opponent_id: string;
  winner_id: string | null;
  margin: number | null;
  sigma_path: string;
  completed_at: string;
  challenger?: { id: string; username: string } | null;
  opponent?: { id: string; username: string } | null;
}

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "EXPIRED";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) return `${Math.floor(hours / 24)}D LEFT`;
  if (hours > 0) return `${hours}H LEFT`;
  return `${mins}M LEFT`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}D AGO`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours > 0) return `${hours}H AGO`;
  const mins = Math.floor(ms / (1000 * 60));
  return `${mins}M AGO`;
}

export default function BattlesSection() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [active, setActive] = useState<ActiveBattle[]>([]);
  const [history, setHistory] = useState<HistoryBattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        authedFetch("/battles/active"),
        authedFetch("/battles/history"),
      ]);
      const activeJson = await activeRes.json();
      const historyJson = await historyRes.json();
      setActive(activeJson.battles ?? []);
      setHistory(historyJson.battles ?? []);
    } catch {
      setActive([]);
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAccept = (battleId: string) => {
    router.push(`/battles/accept/${battleId}` as any);
  };

  const handleDecline = async (battleId: string) => {
    Alert.alert("Decline Battle?", "This challenge will be rejected.", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "DECLINE",
        style: "destructive",
        onPress: async () => {
          try {
            await authedFetch(`/battles/${battleId}/decline`, { method: "POST" });
            fetchData();
          } catch {
            Alert.alert("Error", "Could not decline battle.");
          }
        },
      },
    ]);
  };

  const handleOpenBattle = (battleId: string) => {
    router.push(`/battles/reveal/${battleId}` as any);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="small" />
      </View>
    );
  }

  const sections: Array<{ type: "header" | "active" | "history" | "empty-active" | "empty-history"; key: string; data?: any }> = [
    { type: "header", key: "record" },
  ];

  sections.push({ type: "header", key: "active-label" });
  if (active.length === 0) {
    sections.push({ type: "empty-active", key: "empty-active" });
  } else {
    active.forEach((b) => sections.push({ type: "active", key: `a-${b.id}`, data: b }));
  }

  sections.push({ type: "header", key: "history-label" });
  if (history.length === 0) {
    sections.push({ type: "empty-history", key: "empty-history" });
  } else {
    history.forEach((b) => sections.push({ type: "history", key: `h-${b.id}`, data: b }));
  }

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
      }
      renderItem={({ item }) => {
        if (item.key === "record") return <RecordCard />;

        if (item.key === "active-label") {
          return (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionLabel}>⚔ ACTIVE</Text>
              <Text style={styles.sectionCount}>{String(active.length).padStart(2, "0")}</Text>
            </View>
          );
        }

        if (item.key === "history-label") {
          return (
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionLabel}>HISTORY</Text>
              <Text style={styles.sectionCount}>{String(history.length).padStart(2, "0")}</Text>
            </View>
          );
        }

        if (item.type === "empty-active") {
          return (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>NO ACTIVE BATTLES</Text>
              <Text style={styles.emptySub}>CHALLENGE A FRIEND FROM THE FRIENDS TAB</Text>
            </View>
          );
        }

        if (item.type === "empty-history") {
          return (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>NO BATTLES YET</Text>
              <Text style={styles.emptySub}>YOUR RECORD WILL APPEAR HERE</Text>
            </View>
          );
        }

        if (item.type === "active") {
          const b = item.data as ActiveBattle;
          const isChallenger = profile?.id === b.challenger_id;
          const opponent = isChallenger ? b.opponent : b.challenger;
          return (
            <BattleCard
              kind={isChallenger ? "active-outgoing" : "active-incoming"}
              opponentName={opponent?.username ?? "unknown"}
              sigmaPath={b.sigma_path}
              timeText={timeLeft(b.expires_at)}
              onPress={() => handleOpenBattle(b.id)}
              onAccept={() => handleAccept(b.id)}
              onDecline={() => handleDecline(b.id)}
            />
          );
        }

        if (item.type === "history") {
          const b = item.data as HistoryBattle;
          const isMe = (id?: string | null) => id === profile?.id;
          const isWin = b.winner_id ? isMe(b.winner_id) : false;
          const opponent =
            b.challenger_id === profile?.id ? b.opponent : b.challenger;
          const marginText = b.margin != null ? `+${b.margin}` : undefined;
          return (
            <BattleCard
              kind="history"
              opponentName={opponent?.username ?? "unknown"}
              sigmaPath={b.sigma_path}
              timeText={timeAgo(b.completed_at)}
              isWin={isWin}
              margin={marginText}
              onPress={() => handleOpenBattle(b.id)}
            />
          );
        }

        return null;
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: SPACING.xxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionLine: {
    width: 18,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  sectionLabel: {
    flex: 1,
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
  },
  sectionCount: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  emptyBlock: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textAlign: "center",
  },
});
