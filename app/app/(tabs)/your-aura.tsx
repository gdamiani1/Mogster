import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING } from "../../src/constants/theme";
import { getTierForScore } from "../../src/constants/tiers";
import { SIGMA_PATHS } from "../../src/constants/paths";
import { useAuthStore } from "../../src/store/authStore";
import StatsBar from "../../src/components/StatsBar";
import AuraHistoryItem from "../../src/components/AuraHistoryItem";

const API_URL = "http://localhost:3000";

interface HistoryEntry {
  id: string;
  score: number;
  roast: string;
  thumbnail_url?: string;
  created_at: string;
}

export default function YourAuraScreen() {
  const { profile } = useAuthStore();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/aura/history/${profile.id}`);
      const json = await res.json();
      setHistory(json.history ?? json.data ?? json ?? []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const tier = getTierForScore(profile?.peak_aura ?? 0);
  const currentPath = SIGMA_PATHS.find((p) => p.id === profile?.current_path);
  const initials = (profile?.username ?? "??").slice(0, 2).toUpperCase();

  const ListHeader = () => (
    <View>
      {/* Avatar + Name */}
      <View style={styles.profileSection}>
        <View style={[styles.avatar, { borderColor: tier.color }]}>
          <Text style={[styles.avatarText, { color: tier.color }]}>{initials}</Text>
        </View>
        <Text style={styles.username}>{profile?.username ?? "anon"}</Text>
        <View style={[styles.tierBadge, { backgroundColor: tier.color + "25" }]}>
          <Text style={[styles.tierText, { color: tier.color }]}>{tier.name}</Text>
        </View>
      </View>

      {/* Stats */}
      <StatsBar
        peakAura={profile?.peak_aura ?? 0}
        streak={profile?.current_streak ?? 0}
        totalWins={profile?.total_aura_points ?? 0}
      />

      {/* Current Path */}
      {currentPath && (
        <View style={styles.pathContainer}>
          <Text style={styles.pathLabel}>Current Sigma Path</Text>
          <View style={styles.pathCard}>
            <Text style={styles.pathEmoji}>{currentPath.emoji}</Text>
            <Text style={styles.pathName}>{currentPath.label}</Text>
          </View>
        </View>
      )}

      {/* History header */}
      <Text style={styles.sectionHeader}>Aura History</Text>
    </View>
  );

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Sign in to check your aura, king</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <AuraHistoryItem
              score={item.score}
              roast={item.roast}
              thumbnailUrl={item.thumbnail_url}
              timestamp={item.created_at}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{"📸"}</Text>
              <Text style={styles.emptyText}>
                No aura checks yet. Go drop a pic and find out if you're HIM.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileSection: {
    alignItems: "center",
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    backgroundColor: COLORS.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "800",
  },
  username: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: SPACING.sm,
  },
  tierBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 8,
  },
  tierText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pathContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  pathLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pathCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pathEmoji: {
    fontSize: 22,
    marginRight: SPACING.sm,
  },
  pathName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  list: {
    paddingBottom: SPACING.xxl,
  },
  empty: {
    alignItems: "center",
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
