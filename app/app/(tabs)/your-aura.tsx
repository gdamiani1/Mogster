import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, SPACING } from "../../src/constants/theme";
import { getTierForScore } from "../../src/constants/tiers";
import { SIGMA_PATHS } from "../../src/constants/paths";
import { useAuthStore } from "../../src/store/authStore";
import StatsBar from "../../src/components/StatsBar";
import AuraHistoryItem from "../../src/components/AuraHistoryItem";
import { authedFetch } from "../../src/lib/api";

interface HistoryEntry {
  id: string;
  aura_score: number;
  roast: string;
  image_url?: string;
  tier: string;
  is_saved: boolean;
  created_at: string;
}

type Filter = "all" | "saved";

export default function YourAuraScreen() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const queryString = filter === "saved" ? "?saved=true" : "";
      const res = await authedFetch(`/aura/history/${profile.id}${queryString}`);
      const json = await res.json();
      setHistory(json.checks ?? []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [profile, filter]);

  // Refetch when screen gets focus or filter changes
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const toggleSave = async (entry: HistoryEntry) => {
    const newSaved = !entry.is_saved;
    // Optimistic update
    setHistory((prev) =>
      prev
        .map((h) => (h.id === entry.id ? { ...h, is_saved: newSaved } : h))
        // If we're in saved filter and unsaving, remove from list
        .filter((h) => filter !== "saved" || h.is_saved)
    );
    try {
      await authedFetch(`/aura/check/${entry.id}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: newSaved }),
      });
    } catch {
      // Revert on error
      fetchHistory();
    }
  };

  const openDetail = (id: string) => {
    router.push(`/aura/${id}` as any);
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

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <Text style={styles.sectionHeader}>Aura History</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, filter === "all" && styles.tabActive]}
            onPress={() => setFilter("all")}
          >
            <Text style={[styles.tabText, filter === "all" && styles.tabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === "saved" && styles.tabActive]}
            onPress={() => setFilter("saved")}
          >
            <Text style={[styles.tabText, filter === "saved" && styles.tabTextActive]}>
              ★ Saved
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <AuraHistoryItem
            score={item.aura_score}
            roast={item.roast}
            imageUrl={item.image_url}
            timestamp={item.created_at}
            isSaved={item.is_saved}
            onPress={() => openDetail(item.id)}
            onToggleSave={() => toggleSave(item)}
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
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{filter === "saved" ? "★" : "◉"}</Text>
              <Text style={styles.emptyText}>
                {filter === "saved"
                  ? "No saved cards yet. Tap the star on any aura check to save it."
                  : "No aura checks yet. Go drop a pic and find out if you're HIM."}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  tierText: { fontSize: 13, fontWeight: "700" },
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
  pathEmoji: { fontSize: 22, marginRight: SPACING.sm },
  pathName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  tabs: {
    flexDirection: "row",
    gap: SPACING.xs,
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#fff",
  },
  list: { paddingBottom: SPACING.xxl },
  empty: {
    alignItems: "center",
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
