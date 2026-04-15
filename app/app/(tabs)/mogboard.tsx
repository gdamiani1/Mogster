import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, FONTS } from "../../src/constants/theme";
import { SIGMA_PATHS, SigmaPathId } from "../../src/constants/paths";
import { useAuthStore } from "../../src/store/authStore";
import { authedFetch } from "../../src/lib/api";

type Tab = "global" | "path" | "circle";

interface LeaderboardEntry {
  id: string;
  username: string;
  peak_aura: number;
  tier?: string;
  avatar_color?: string;
}

function shortTier(tier?: string): string {
  if (!tier) return "—";
  const upper = tier.toUpperCase();
  if (upper.includes("SKIBIDI")) return "SKIBIDI";
  if (upper.includes("MOG GOD")) return "MOG GOD";
  if (upper.includes("SIGMA")) return "SIGMA";
  if (upper.includes("HIM") || upper.includes("HER")) return "HIM/HER";
  if (upper.includes("COOK")) return "COOKING";
  if (upper.includes("6") || upper.includes("SEVEN")) return "6-7";
  if (upper.includes("NPC")) return "NPC";
  return "DOWN BAD";
}

function tierColor(tier?: string): string {
  const s = shortTier(tier);
  if (s === "SKIBIDI") return "#FFFFFF";
  if (s === "MOG GOD" || s === "SIGMA" || s === "HIM/HER") return COLORS.primary;
  if (s === "COOKING") return "#FFB84D";
  if (s === "6-7") return "#C9A14A";
  return "#6B6B5E";
}

export default function MogBoardScreen() {
  const { profile } = useAuthStore();
  const [tab, setTab] = useState<Tab>("global");
  const [selectedPath, setSelectedPath] = useState<SigmaPathId>("auramaxxing");
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pathPickerOpen, setPathPickerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let path = `/mogboard/global`;
      if (tab === "path") path = `/mogboard/path/${selectedPath}`;
      if (tab === "circle" && profile) path = `/mogboard/circle/${profile.id}`;
      const res = await authedFetch(path);
      const json = await res.json();
      setData(json.leaderboard ?? json.data ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tab, selectedPath, profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const selectedPathObj = SIGMA_PATHS.find((p) => p.id === selectedPath);

  // ─── List row ───
  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const isMe = profile?.id === item.id;
    const color = tierColor(item.tier);
    return (
      <View style={[styles.row, isMe && styles.rowMe]}>
        <View style={styles.rankCol}>
          <Text style={[styles.rank, rank <= 3 && { color: COLORS.primary }]}>
            {String(rank).padStart(2, "0")}
          </Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.name}>@{item.username}</Text>
          <Text style={[styles.tier, { color }]}>{shortTier(item.tier)}</Text>
        </View>
        <Text style={[styles.score, { color }]} numberOfLines={1}>
          {item.peak_aura}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Editorial header */}
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>SECTION 02 · THE RANKING</Text>
        </View>
        <Text style={styles.title}>MOG{"\n"}BOARD.</Text>
        <Text style={styles.subtitle}>WHO'S ACTUALLY HIM RIGHT NOW</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["global", "path", "circle"] as Tab[]).map((value) => {
          const active = tab === value;
          const label = value === "global" ? "GLOBAL" : value === "path" ? "BY PATH" : "YOUR CIRCLE";
          return (
            <TouchableOpacity
              key={value}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Path picker */}
      {tab === "path" && (
        <View style={styles.pathSection}>
          <TouchableOpacity
            style={styles.pathPicker}
            onPress={() => setPathPickerOpen(!pathPickerOpen)}
            activeOpacity={0.75}
          >
            <Text style={styles.pathPickerLabel}>FILTER</Text>
            <Text style={styles.pathPickerValue}>
              {selectedPathObj?.label.toUpperCase()}
            </Text>
            <Text style={styles.pathChevron}>{pathPickerOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          {pathPickerOpen && (
            <View style={styles.pathDropdown}>
              {SIGMA_PATHS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.pathOption,
                    p.id === selectedPath && styles.pathOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedPath(p.id);
                    setPathPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pathOptionText,
                      p.id === selectedPath && { color: COLORS.bg },
                    ]}
                  >
                    {p.label.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Column labels */}
      <View style={styles.columnLabels}>
        <View style={styles.rankCol}>
          <Text style={styles.columnLabel}>RANK</Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.columnLabel}>PLAYER</Text>
        </View>
        <Text style={[styles.columnLabel, { textAlign: "right" }]}>AURA</Text>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="small" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
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
              <Text style={styles.emptyLabel}>NO DATA</Text>
              <Text style={styles.emptyText}>
                NO ONE'S COOKING YET.{"\n"}BE THE FIRST TO DROP A PIC.
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

  // ─── Header ───
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 214, 10, 0.12)",
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
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
  title: {
    fontFamily: FONTS.display,
    fontSize: 64,
    lineHeight: 56,
    color: COLORS.textPrimary,
    letterSpacing: -2,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },

  // ─── Tabs ───
  tabs: {
    flexDirection: "row",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.8,
  },
  tabTextActive: {
    color: COLORS.bg,
  },

  // ─── Path picker ───
  pathSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    zIndex: 10,
  },
  pathPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.bgCard,
  },
  pathPickerLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  pathPickerValue: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  pathChevron: {
    fontFamily: FONTS.mono,
    color: COLORS.primary,
    fontSize: 10,
  },
  pathDropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 0,
    backgroundColor: COLORS.bgCard,
  },
  pathOption: {
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pathOptionActive: {
    backgroundColor: COLORS.primary,
  },
  pathOptionText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },

  // ─── Column labels ───
  columnLabels: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 214, 10, 0.12)",
  },
  columnLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },

  // ─── Row ───
  list: {
    paddingBottom: SPACING.xxl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 214, 10, 0.06)",
  },
  rowMe: {
    backgroundColor: "rgba(255, 214, 10, 0.04)",
  },
  rankCol: {
    width: 44,
  },
  rank: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  tier: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    letterSpacing: 1.8,
    marginTop: 1,
  },
  score: {
    fontFamily: FONTS.display,
    fontSize: 32,
    letterSpacing: -1.5,
    minWidth: 72,
    textAlign: "right",
    includeFontPadding: false,
  },

  // ─── Empty / loading ───
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    marginTop: SPACING.xxl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.primary,
    letterSpacing: 3,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: 1.2,
  },
});
