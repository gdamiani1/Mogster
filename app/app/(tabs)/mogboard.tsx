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
import { COLORS, SPACING } from "../../src/constants/theme";
import { SIGMA_PATHS, SigmaPathId } from "../../src/constants/paths";
import { useAuthStore } from "../../src/store/authStore";
import LeaderboardRow from "../../src/components/LeaderboardRow";

const API_URL = "http://localhost:3000";

type Tab = "global" | "path" | "circle";

interface LeaderboardEntry {
  id: string;
  username: string;
  peak_aura: number;
  avatar_color?: string;
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
      let url = `${API_URL}/mogboard/global`;
      if (tab === "path") url = `${API_URL}/mogboard/path/${selectedPath}`;
      if (tab === "circle" && profile) url = `${API_URL}/mogboard/circle/${profile.id}`;

      const res = await fetch(url);
      const json = await res.json();
      setData(json.leaderboard ?? json.data ?? json ?? []);
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

  const renderTab = (label: string, value: Tab) => (
    <TouchableOpacity
      key={value}
      style={[styles.tab, tab === value && styles.tabActive]}
      onPress={() => setTab(value)}
    >
      <Text style={[styles.tabText, tab === value && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const selectedPathObj = SIGMA_PATHS.find((p) => p.id === selectedPath);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Mog Board</Text>
      <Text style={styles.subtitle}>Who's actually HIM right now</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        {renderTab("Global", "global")}
        {renderTab("By Path", "path")}
        {renderTab("Your Circle", "circle")}
      </View>

      {/* Path picker */}
      {tab === "path" && (
        <View style={styles.pathSection}>
          <TouchableOpacity
            style={styles.pathPicker}
            onPress={() => setPathPickerOpen(!pathPickerOpen)}
          >
            <Text style={styles.pathPickerText}>
              {selectedPathObj?.emoji} {selectedPathObj?.label}
            </Text>
            <Text style={styles.pathChevron}>{pathPickerOpen ? "\u25B2" : "\u25BC"}</Text>
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
                  <Text style={styles.pathOptionText}>
                    {p.emoji} {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <LeaderboardRow
              rank={index + 1}
              username={item.username}
              peakAura={item.peak_aura}
              avatarColor={item.avatar_color}
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
              <Text style={styles.emptyEmoji}>{"💀"}</Text>
              <Text style={styles.emptyText}>
                No one's cooking yet. Be the first to drop a pic.
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
  header: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  pathSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    zIndex: 10,
  },
  pathPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pathPickerText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  pathChevron: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  pathDropdown: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 10,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  pathOption: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
  },
  pathOptionActive: {
    backgroundColor: COLORS.primary + "20",
  },
  pathOptionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  list: {
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xxl,
  },
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
