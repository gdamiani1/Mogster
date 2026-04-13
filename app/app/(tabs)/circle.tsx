import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING } from "../../src/constants/theme";
import { getTierForScore } from "../../src/constants/tiers";
import { useAuthStore } from "../../src/store/authStore";

const API_URL = "http://localhost:3000";

interface Friend {
  id: string;
  username: string;
  peak_aura: number;
  avatar_color?: string;
}

interface PendingRequest {
  id: string;
  from_user_id: string;
  from_username: string;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default function CircleScreen() {
  const { profile } = useAuthStore();
  const [searchText, setSearchText] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [linking, setLinking] = useState(false);

  const fetchCircle = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [circleRes, pendingRes] = await Promise.all([
        fetch(`${API_URL}/circle/${profile.id}`),
        fetch(`${API_URL}/circle/pending/${profile.id}`),
      ]);
      const circleJson = await circleRes.json();
      const pendingJson = await pendingRes.json();
      setFriends(circleJson.circle ?? circleJson.data ?? circleJson ?? []);
      setPending(pendingJson.pending ?? pendingJson.data ?? pendingJson ?? []);
    } catch {
      setFriends([]);
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchCircle();
  }, [fetchCircle]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCircle();
    setRefreshing(false);
  };

  const handleLinkUp = async () => {
    if (!searchText.trim() || !profile) return;
    setLinking(true);
    try {
      const res = await fetch(`${API_URL}/circle/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_user_id: profile.id,
          to_username: searchText.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        Alert.alert("W", "Link request sent. They'll see it fr fr.");
        setSearchText("");
      } else {
        Alert.alert("L", json.error ?? "Couldn't link up rn. Try again.");
      }
    } catch {
      Alert.alert("L", "Network error. Are you even connected?");
    } finally {
      setLinking(false);
    }
  };

  const handleRespond = async (requestId: string, action: "accept" | "block") => {
    if (!profile) return;
    try {
      await fetch(`${API_URL}/circle/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          user_id: profile.id,
          action,
        }),
      });
      await fetchCircle();
    } catch {
      Alert.alert("L", "Couldn't respond rn. Try again.");
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => {
    const tier = getTierForScore(item.peak_aura);
    const color = item.avatar_color || COLORS.primary;

    return (
      <View style={styles.friendRow}>
        <View style={[styles.avatar, { backgroundColor: color + "30", borderColor: color }]}>
          <Text style={[styles.avatarText, { color }]}>{getInitials(item.username)}</Text>
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.username}</Text>
          <View style={[styles.tierBadge, { backgroundColor: tier.color + "25" }]}>
            <Text style={[styles.tierText, { color: tier.color }]}>{tier.name}</Text>
          </View>
        </View>
        <Text style={styles.friendScore}>{item.peak_aura}</Text>
      </View>
    );
  };

  const renderPending = ({ item }: { item: PendingRequest }) => (
    <View style={styles.pendingRow}>
      <View style={[styles.avatarSmall, { backgroundColor: COLORS.primary + "30", borderColor: COLORS.primary }]}>
        <Text style={[styles.avatarTextSmall, { color: COLORS.primary }]}>
          {getInitials(item.from_username)}
        </Text>
      </View>
      <Text style={styles.pendingName} numberOfLines={1}>
        {item.from_username}
      </Text>
      <TouchableOpacity
        style={styles.acceptBtn}
        onPress={() => handleRespond(item.id, "accept")}
      >
        <Text style={styles.acceptText}>Accept</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.blockBtn}
        onPress={() => handleRespond(item.id, "block")}
      >
        <Text style={styles.blockText}>Block</Text>
      </TouchableOpacity>
    </View>
  );

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Sign in to build your circle, king</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = () => (
    <View>
      {/* Search + Link Up */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor={COLORS.textMuted}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.linkBtn, linking && styles.linkBtnDisabled]}
          onPress={handleLinkUp}
          disabled={linking}
        >
          <Text style={styles.linkBtnText}>{linking ? "..." : "Link Up"}</Text>
        </TouchableOpacity>
      </View>

      {/* Pending Requests */}
      {pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>
            Pending Requests ({pending.length})
          </Text>
          {pending.map((item) => (
            <View key={item.id}>{renderPending({ item })}</View>
          ))}
        </View>
      )}

      {/* Circle header */}
      <Text style={styles.sectionHeader}>Your Circle</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Your Circle</Text>
      <Text style={styles.subtitle}>The squad that mogs together stays together</Text>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          renderItem={renderFriend}
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
              <Text style={styles.emptyEmoji}>{"👥"}</Text>
              <Text style={styles.emptyText}>
                Your circle is empty. Link up with friends to compare auras.
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  linkBtnDisabled: {
    opacity: 0.5,
  },
  linkBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  // Friend row
  friendRow: {
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  friendInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  friendName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  tierBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierText: {
    fontSize: 11,
    fontWeight: "700",
  },
  friendScore: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "800",
  },
  // Pending row
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTextSmall: {
    fontSize: 12,
    fontWeight: "700",
  },
  pendingName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: SPACING.sm,
  },
  acceptBtn: {
    backgroundColor: COLORS.success + "20",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginLeft: SPACING.sm,
  },
  acceptText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: "700",
  },
  blockBtn: {
    backgroundColor: COLORS.danger + "20",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginLeft: SPACING.sm,
  },
  blockText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  list: {
    paddingBottom: SPACING.xxl,
  },
  empty: {
    alignItems: "center",
    marginTop: SPACING.xxl,
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
