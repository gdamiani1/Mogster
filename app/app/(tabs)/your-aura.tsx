import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Linking,
  Switch,
} from "react-native";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, SPACING, FONTS } from "../../src/constants/theme";
import { SIGMA_PATHS } from "../../src/constants/paths";
import { useAuthStore } from "../../src/store/authStore";
import { authedFetch } from "../../src/lib/api";
import {
  getPermissionStatus,
  requestPermissionsAndRegister,
  unregister,
} from "../../src/lib/notifications";

interface HistoryEntry {
  id: string;
  aura_score: number;
  roast: string;
  image_url?: string;
  tier: string;
  is_saved: boolean;
  created_at: string;
  sigma_path?: string;
}

type Filter = "all" | "saved";

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

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins}M AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}H AGO`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}D AGO`;
  return `${Math.floor(days / 7)}W AGO`;
}

export default function YourAuraScreen() {
  const { profile, user, signOut, updateUsername } = useAuthStore();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notifOn, setNotifOn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await getPermissionStatus();
        setNotifOn(status === "granted");
      } catch {
        setNotifOn(false);
      }
    })();
  }, []);

  const toggleNotif = async (v: boolean) => {
    setNotifOn(v);
    try {
      if (v) {
        // If OS-level denied with no re-prompt, the in-app flow can't grant;
        // send the user to Settings instead.
        const { status, canAskAgain } = await getPermissionStatus();
        if (status === "denied" && !canAskAgain) {
          setNotifOn(false);
          Alert.alert(
            "Notifications are off",
            "Enable notifications for Mogster in iOS Settings to turn this on.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
        const token = await requestPermissionsAndRegister();
        if (!token) setNotifOn(false);
      } else {
        await unregister();
      }
    } catch {
      setNotifOn(!v);
    }
  };

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
    setHistory((prev) =>
      prev
        .map((h) => (h.id === entry.id ? { ...h, is_saved: newSaved } : h))
        .filter((h) => filter !== "saved" || h.is_saved)
    );
    try {
      await authedFetch(`/aura/check/${entry.id}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: newSaved }),
      });
    } catch {
      fetchHistory();
    }
  };

  const openDetail = (id: string) => {
    router.push(`/aura/${id}` as any);
  };

  // ─── Settings handlers ───
  const handleEditUsername = () => {
    if (Platform.OS === "ios" && (Alert as any).prompt) {
      (Alert as any).prompt(
        "CHANGE USERNAME",
        "3-20 chars · letters, numbers, underscores",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: async (value?: string) => {
              if (!value) return;
              try {
                await updateUsername(value);
                Alert.alert("W", "Username updated, king.");
              } catch (e: any) {
                Alert.alert("L", e?.message ?? "Update failed");
              }
            },
          },
        ],
        "plain-text",
        profile?.username ?? ""
      );
    } else {
      Alert.alert(
        "Edit Username",
        "Username editing requires iOS for now. Coming to Android soon."
      );
    }
  };

  const handleLogout = () => {
    Alert.alert("LOG OUT?", "You'll need to sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "LOG OUT",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const openLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error(`Cannot open URL: ${url}`);
      await Linking.openURL(url);
    } catch {
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
      } catch {
        // Haptics may not be available on all devices; non-critical
      }
      Alert.alert(
        "Cannot open link",
        "We couldn't open that page. Try again in a moment — or email support@mogster.app."
      );
    }
  };

  const appVersion =
    (Constants as any).expoConfig?.version ??
    (Constants as any).manifest?.version ??
    "0.1.0";

  const peakAura = profile?.peak_aura ?? 0;
  const streak = profile?.current_streak ?? 0;
  const totalPoints = (profile as any)?.total_aura_points ?? 0;
  const currentPath = SIGMA_PATHS.find((p) => p.id === profile?.current_path);
  const initials = (profile?.username ?? "??").slice(0, 2).toUpperCase();
  const profileTierColor = tierColor(profile?.tier);
  const profileTierLabel = shortTier(profile?.tier);

  const renderItem = ({ item }: { item: HistoryEntry }) => {
    const c = tierColor(item.tier);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openDetail(item.id)}
        activeOpacity={0.85}
      >
        {/* Thumbnail */}
        <View style={[styles.thumb, { borderColor: c }]}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.thumbImg} />
          ) : (
            <Text style={[styles.thumbScore, { color: c }]}>
              {item.aura_score}
            </Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.rowInfo}>
          <View style={styles.rowTopLine}>
            <Text style={[styles.rowScore, { color: c }]}>{item.aura_score}</Text>
            <Text style={[styles.rowTier, { color: c }]}>{shortTier(item.tier)}</Text>
          </View>
          <Text style={styles.rowRoast} numberOfLines={2}>
            {item.roast}
          </Text>
          <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
        </View>

        {/* Save star */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => toggleSave(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text
            style={[
              styles.saveIcon,
              { color: item.is_saved ? COLORS.primary : COLORS.textMuted },
            ]}
          >
            {item.is_saved ? "★" : "☆"}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Editorial header */}
      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>SECTION 03 · THE DOSSIER</Text>
        </View>
        <Text style={styles.title}>YOUR{"\n"}AURA.</Text>
      </View>

      {/* Identity card */}
      <View style={styles.identityCard}>
        <View style={[styles.avatar, { borderColor: profileTierColor }]}>
          <Text style={[styles.avatarText, { color: profileTierColor }]}>
            {initials}
          </Text>
        </View>
        <View style={styles.identityInfo}>
          <Text style={styles.identityLabel}>SUBJECT</Text>
          <Text style={styles.identityName}>@{profile?.username ?? "anon"}</Text>
          <Text style={[styles.identityTier, { color: profileTierColor }]}>
            {profileTierLabel}
          </Text>
        </View>
      </View>

      {/* Stat grid */}
      <View style={styles.statGrid}>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>PEAK</Text>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>
            {peakAura}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>STREAK</Text>
          <Text style={styles.statValue}>
            {String(streak).padStart(2, "0")}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>TOTAL W</Text>
          <Text style={styles.statValue}>{totalPoints}</Text>
        </View>
      </View>

      {/* Current path strip */}
      {currentPath && (
        <View style={styles.pathStrip}>
          <Text style={styles.pathStripLabel}>CURRENT LENS</Text>
          <Text style={styles.pathStripValue}>
            {currentPath.label.toUpperCase()}
          </Text>
        </View>
      )}

      {/* History section header + filter */}
      <View style={styles.historyHead}>
        <View style={styles.historyHeadLeft}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.historyLabel}>AURA HISTORY</Text>
          <Text style={styles.historyCount}>
            {String(history.length).padStart(2, "0")}
          </Text>
        </View>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "all" && styles.filterTextActive,
              ]}
            >
              ALL
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "saved" && styles.filterTabActive]}
            onPress={() => setFilter("saved")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "saved" && styles.filterTextActive,
              ]}
            >
              ★ SAVED
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
          <Text style={styles.emptyLabel}>NOT SIGNED IN</Text>
          <Text style={styles.emptySub}>SIGN IN TO CHECK YOUR AURA</Text>
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
        ListFooterComponent={
          <View style={styles.settingsBlock}>
            {/* Section label */}
            <View style={styles.settingsHeader}>
              <View style={styles.eyebrowLine} />
              <Text style={styles.settingsLabel}>SETTINGS</Text>
            </View>

            {/* Email (readonly) */}
            <View style={styles.settingsCard}>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowLabel}>EMAIL</Text>
                <Text style={styles.settingsRowValue} numberOfLines={1}>
                  {user?.email ?? "—"}
                </Text>
              </View>

              <View style={styles.settingsDivider} />

              {/* Username edit */}
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={handleEditUsername}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsRowLabel}>USERNAME</Text>
                <View style={styles.settingsRowRight}>
                  <Text style={styles.settingsRowValue}>
                    @{profile?.username ?? "—"}
                  </Text>
                  <Text style={styles.settingsChevron}>EDIT →</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.settingsDivider} />

              {/* Sigma path (info only) */}
              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowLabel}>LENS</Text>
                <Text style={styles.settingsRowValue}>
                  {currentPath?.label.toUpperCase() ?? "—"}
                </Text>
              </View>
            </View>

            {/* Links */}
            <View style={styles.settingsCard}>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowLabel}>NOTIFICATIONS</Text>
                <Switch
                  value={notifOn}
                  onValueChange={toggleNotif}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={notifOn ? COLORS.bg : COLORS.textPrimary}
                  ios_backgroundColor={COLORS.border}
                />
              </View>
              <View style={styles.settingsDivider} />
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => openLink("https://mogster.app/privacy")}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsRowLabel}>PRIVACY</Text>
                <Text style={styles.settingsChevron}>→</Text>
              </TouchableOpacity>
              <View style={styles.settingsDivider} />
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => openLink("https://mogster.app/terms")}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsRowLabel}>TERMS</Text>
                <Text style={styles.settingsChevron}>→</Text>
              </TouchableOpacity>
              <View style={styles.settingsDivider} />
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => openLink("mailto:support@mogster.app")}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsRowLabel}>SUPPORT</Text>
                <Text style={styles.settingsChevron}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Logout */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <Text style={styles.logoutText}>⏻ LOG OUT</Text>
            </TouchableOpacity>

            {/* Version footer */}
            <Text style={styles.versionText}>
              MOGSTER · v{appVersion} · ISSUE 01
            </Text>
          </View>
        }
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
          loading ? (
            <View style={styles.emptyBlock}>
              <ActivityIndicator color={COLORS.primary} size="small" />
            </View>
          ) : (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyLabel}>
                {filter === "saved" ? "NO SAVED CARDS" : "NO AURA CHECKS"}
              </Text>
              <Text style={styles.emptySub}>
                {filter === "saved"
                  ? "TAP THE STAR ON ANY CARD TO SAVE IT"
                  : "DROP A PIC IN VIBE CHECK TO GET COOKED"}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  list: { paddingBottom: 120 },

  // ─── Header ───
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
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
    lineHeight: 74,
    includeFontPadding: false,
    paddingTop: 8,
    color: COLORS.textPrimary,
    letterSpacing: -2,
  },

  // ─── Identity card ───
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  avatar: {
    width: 64,
    height: 64,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgElevated,
  },
  avatarText: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -1,
    includeFontPadding: false,
    paddingTop: 4,
  },
  identityInfo: {
    flex: 1,
  },
  identityLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  identityName: {
    fontFamily: FONTS.display,
    fontSize: 26,
    lineHeight: 32,
    includeFontPadding: false,
    paddingTop: 4,
    color: COLORS.textPrimary,
    letterSpacing: -0.8,
  },
  identityTier: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 2,
  },

  // ─── Stat grid ───
  statGrid: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: COLORS.border,
  },
  statLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 36,
    lineHeight: 42,
    includeFontPadding: false,
    paddingTop: 4,
    color: COLORS.textPrimary,
    letterSpacing: -1.2,
  },

  // ─── Current path strip ───
  pathStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 214, 10, 0.06)",
  },
  pathStripLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
  },
  pathStripValue: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 20,
    includeFontPadding: false,
    paddingTop: 2,
  },

  // ─── History section head ───
  historyHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  historyHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  historyLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
  },
  historyCount: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  filterTabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  filterTextActive: {
    color: COLORS.bg,
  },

  // ─── History row ───
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumb: {
    width: 56,
    height: 56,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgElevated,
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },
  thumbScore: {
    fontFamily: FONTS.display,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  rowInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  rowTopLine: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  rowScore: {
    fontFamily: FONTS.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.8,
    includeFontPadding: false,
    paddingTop: 3,
  },
  rowTier: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  rowRoast: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textSecondary,
    lineHeight: 14,
    marginTop: 2,
  },
  rowTime: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginTop: 3,
  },
  saveBtn: {
    paddingLeft: SPACING.sm,
    paddingRight: 4,
  },
  saveIcon: {
    fontSize: 22,
  },

  // ─── Empty ───
  emptyBlock: {
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
  },
  emptyLabel: {
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

  // ─── Settings ───
  settingsBlock: {
    marginTop: SPACING.xl,
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  settingsLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
  },
  settingsCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  settingsRowLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  settingsRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    justifyContent: "flex-end",
  },
  settingsRowValue: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 19,
    includeFontPadding: false,
    paddingTop: 2,
    maxWidth: 200,
  },
  settingsChevron: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 1.5,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  logoutBtn: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.blood,
    backgroundColor: "rgba(255, 59, 48, 0.08)",
  },
  logoutText: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: COLORS.blood,
    letterSpacing: 2.5,
  },
  versionText: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: SPACING.lg,
  },
});
