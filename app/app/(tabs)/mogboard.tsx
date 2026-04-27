import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
  Dimensions,
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
  current_streak?: number;
  avatar_color?: string;
}

const SCREEN_W = Dimensions.get("window").width;

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
  if (s === "SKIBIDI") return COLORS.paper;
  if (s === "MOG GOD" || s === "SIGMA" || s === "HIM/HER") return COLORS.hazard;
  if (s === "COOKING") return COLORS.tierGold;
  if (s === "6-7") return COLORS.tierBronze;
  return COLORS.tierGrey;
}

// ─── #1 THRONE ROW ─────────────────────────────────────────────

interface RowProps {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
}

function ThroneRow({ entry, isMe }: RowProps) {
  // Shimmer sweep: translates from off-left to off-right, looping
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 3400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1200),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const shimmerX = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_W * 0.5, SCREEN_W * 1.2],
  });

  const peakLabel = entry.peak_aura ? `PEAK ${entry.peak_aura}` : "PEAK —";
  const streakLabel = entry.current_streak ? ` · ${entry.current_streak} STREAK` : "";

  return (
    <View style={[styles.throneWrapper, isMe && { borderColor: COLORS.mint }]}>
      <View style={styles.throne}>
        {/* Crown stamp top-right */}
        <View style={styles.crownStamp}>
          <Text style={styles.crownStampText}>★ MOG GOD</Text>
        </View>

        <View style={styles.throneRankCol}>
          <Text style={styles.throneRank}>01</Text>
          <Text style={styles.throneCrown}>▌ HIM</Text>
        </View>

        <View style={styles.throneBody}>
          <Text style={styles.throneUser}>@{entry.username.toUpperCase()}</Text>
          <Text style={styles.throneMeta}>
            {peakLabel}{streakLabel} · UNCONTESTED
          </Text>
        </View>

        <Text style={styles.throneScore}>{entry.peak_aura}</Text>

        {/* Shimmer sweep */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmerX }] },
          ]}
        />
      </View>

      {/* Streak bar — bottom edge, dashed ink-on-hazard */}
      <View style={styles.streakBar}>
        {Array.from({ length: 24 }).map((_, i) => (
          <View key={i} style={styles.streakSegment} />
        ))}
      </View>
    </View>
  );
}

// ─── #2/#3 PODIUM ROW ──────────────────────────────────────────

function PodiumRow({ entry, rank, isMe }: RowProps) {
  return (
    <View style={[styles.podiumRow, isMe && styles.youRow]}>
      <View style={styles.rankCol}>
        <Text style={[styles.podiumRank, isMe && styles.youText]}>
          {String(rank).padStart(2, "0")}
        </Text>
        <View style={[styles.podiumUnderline, isMe && { backgroundColor: COLORS.mint }]} />
      </View>
      <View style={styles.nameCol}>
        <Text style={[styles.name, isMe && styles.youText]}>
          @{entry.username.toUpperCase()}
        </Text>
        <Text style={[styles.tier, { color: isMe ? COLORS.mint : tierColor(entry.tier) }]}>
          {shortTier(entry.tier)}
        </Text>
      </View>
      <Text style={[styles.score, { color: isMe ? COLORS.mint : COLORS.paper }]}>
        {entry.peak_aura}
      </Text>
    </View>
  );
}

// ─── STANDARD ROW (rank 4+) ────────────────────────────────────

function StandardRow({ entry, rank, isMe }: RowProps) {
  return (
    <View style={[styles.row, isMe && styles.youRow]}>
      {isMe && (
        <View style={styles.deltaBadge}>
          <Text style={styles.deltaText}>▲ YOU</Text>
        </View>
      )}
      <View style={styles.rankCol}>
        <Text style={[styles.rank, isMe && styles.youText]}>
          {String(rank).padStart(2, "0")}
        </Text>
      </View>
      <View style={styles.nameCol}>
        <Text style={[styles.name, isMe && styles.youText]}>
          @{entry.username.toUpperCase()}
        </Text>
        <Text style={[styles.tier, { color: isMe ? COLORS.mint : tierColor(entry.tier) }]}>
          {shortTier(entry.tier)}
        </Text>
      </View>
      <Text style={[styles.score, { color: isMe ? COLORS.mint : tierColor(entry.tier) }]}>
        {entry.peak_aura}
      </Text>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────

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

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const isMe = profile?.id === item.id;

    if (rank === 1) return <ThroneRow entry={item} rank={rank} isMe={isMe} />;
    if (rank === 2 || rank === 3) return <PodiumRow entry={item} rank={rank} isMe={isMe} />;
    return <StandardRow entry={item} rank={rank} isMe={isMe} />;
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
        <Text style={styles.subtitle}>WHO&apos;S ACTUALLY HIM RIGHT NOW</Text>
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
                      p.id === selectedPath && { color: COLORS.ink },
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
          <ActivityIndicator color={COLORS.hazard} size="small" />
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
              tintColor={COLORS.hazard}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyLabel}>NO DATA</Text>
              <Text style={styles.emptyText}>
                NO ONE&apos;S COOKING YET.{"\n"}BE THE FIRST TO DROP A PIC.
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
    backgroundColor: COLORS.ink,
  },

  // ─── Header ───
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hazard12,
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
    backgroundColor: COLORS.hazard,
    opacity: 0.6,
  },
  eyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.hazard,
    letterSpacing: 2.5,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 64,
    lineHeight: 74,
    includeFontPadding: false,
    paddingTop: 8,
    color: COLORS.paper,
    letterSpacing: -2,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.ghost,
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
    backgroundColor: COLORS.hazard,
  },
  tabText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.ghost,
    letterSpacing: 1.8,
  },
  tabTextActive: {
    color: COLORS.ink,
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
    backgroundColor: COLORS.ink2,
  },
  pathPickerLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.ghost,
    letterSpacing: 1.5,
  },
  pathPickerValue: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.paper,
    letterSpacing: -0.5,
  },
  pathChevron: {
    fontFamily: FONTS.mono,
    color: COLORS.hazard,
    fontSize: 10,
  },
  pathDropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 0,
    backgroundColor: COLORS.ink2,
  },
  pathOption: {
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pathOptionActive: {
    backgroundColor: COLORS.hazard,
  },
  pathOptionText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: COLORS.paper,
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
    borderColor: COLORS.hazard12,
  },
  columnLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    color: COLORS.ghost,
    letterSpacing: 2,
  },

  // ─── List wrapper ───
  list: {
    paddingBottom: SPACING.xxl,
  },

  // ─── Throne (rank 1) ───
  throneWrapper: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.hazard,
  },
  throne: {
    backgroundColor: COLORS.hazard,
    paddingVertical: 20,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  crownStamp: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    transform: [{ rotate: "3deg" }],
    zIndex: 3,
  },
  crownStampText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.hazard,
    letterSpacing: 2.5,
  },
  throneRankCol: {
    width: 96,
  },
  throneRank: {
    fontFamily: FONTS.display,
    fontSize: 64,
    lineHeight: 56,
    color: COLORS.ink,
    letterSpacing: -3,
    includeFontPadding: false,
    paddingTop: 4,
  },
  throneCrown: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.ink,
    letterSpacing: 3,
    marginTop: 4,
  },
  throneBody: {
    flex: 1,
    minWidth: 0,
    zIndex: 2,
  },
  throneUser: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.ink,
    letterSpacing: -0.3,
    paddingTop: 2,
  },
  throneMeta: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.ink,
    letterSpacing: 1.6,
    marginTop: 2,
    opacity: 0.75,
  },
  throneScore: {
    fontFamily: FONTS.display,
    fontSize: 56,
    lineHeight: 50,
    color: COLORS.ink,
    letterSpacing: -3,
    includeFontPadding: false,
    paddingTop: 4,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "rgba(255,255,255,0.5)",
    transform: [{ skewX: "-15deg" }],
    opacity: 0.7,
  },
  streakBar: {
    flexDirection: "row",
    height: 4,
    backgroundColor: COLORS.hazard,
  },
  streakSegment: {
    flex: 1,
    backgroundColor: COLORS.ink,
    marginHorizontal: 2,
  },

  // ─── Podium (ranks 2 + 3) ───
  podiumRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    backgroundColor: COLORS.ink2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.hazard25,
  },
  podiumRank: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 28,
    color: COLORS.hazard,
    letterSpacing: -1.5,
    includeFontPadding: false,
    paddingTop: 4,
  },
  podiumUnderline: {
    width: 28,
    height: 2,
    backgroundColor: COLORS.hazard,
    marginTop: 4,
  },

  // ─── Standard row ───
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hazard06,
  },
  rankCol: {
    width: 44,
  },
  rank: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: COLORS.ghost,
    letterSpacing: 1.5,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.paper,
    letterSpacing: -0.5,
    lineHeight: 24,
    includeFontPadding: false,
    paddingTop: 3,
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
    lineHeight: 38,
    paddingTop: 4,
    letterSpacing: -1.5,
    minWidth: 72,
    textAlign: "right",
    includeFontPadding: false,
  },

  // ─── YOU — mint glow on user's row (any rank) ───
  youRow: {
    backgroundColor: "rgba(127,255,161,0.06)",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.mint,
  },
  youText: {
    color: COLORS.mint,
  },
  deltaBadge: {
    position: "absolute",
    top: 4,
    right: 8,
    backgroundColor: COLORS.mint,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 3,
  },
  deltaText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.ink,
    letterSpacing: 2.5,
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
    color: COLORS.hazard,
    letterSpacing: 3,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontFamily: FONTS.mono,
    color: COLORS.ghost,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: 1.2,
  },
});
