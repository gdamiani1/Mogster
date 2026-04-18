import React, { useCallback, useEffect, useState } from "react";
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
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { COLORS, SPACING, FONTS } from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { authedFetch } from "../../lib/api";

interface Friend {
  id: string;
  username: string;
  peak_aura: number;
  avatar_color?: string;
}

interface PendingRequest {
  id: string;
  requester?: { id: string; username: string } | null;
  // Legacy flat fields (in case API changes)
  from_user_id?: string;
  from_username?: string;
}

function getInitials(name?: string | null): string {
  return (name ?? "??").slice(0, 2).toUpperCase();
}

export default function FriendsSection() {
  const router = useRouter();
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
        authedFetch(`/circle/${profile.id}`),
        authedFetch(`/circle/pending/${profile.id}`),
      ]);
      const circleJson = await circleRes.json();
      const pendingJson = await pendingRes.json();
      setFriends(circleJson.circle ?? circleJson.data ?? []);
      setPending(pendingJson.pending ?? pendingJson.data ?? []);
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
    Keyboard.dismiss();
    setLinking(true);
    try {
      const res = await authedFetch(`/circle/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressee_username: searchText.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        Alert.alert("W", "LINK REQUEST SENT. THEY'LL SEE IT FR FR.");
        setSearchText("");
      } else {
        Alert.alert("L", json.error ?? "COULDN'T LINK UP RN. TRY AGAIN.");
      }
    } catch {
      Alert.alert("L", "NETWORK ERROR. ARE YOU EVEN CONNECTED?");
    } finally {
      setLinking(false);
    }
  };

  const handleRespond = async (
    requestId: string,
    action: "accepted" | "blocked"
  ) => {
    if (!profile) return;
    try {
      await authedFetch(`/circle/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendship_id: requestId, action }),
      });
      await fetchCircle();
    } catch {
      Alert.alert("L", "COULDN'T RESPOND RN. TRY AGAIN.");
    }
  };

  const challenge = (friend: Friend) => {
    router.push(
      `/battles/challenge/${friend.id}?friendUsername=${friend.username}` as any
    );
  };

  // Filter friends by local search
  const filteredFriends = searchText.trim()
    ? friends.filter((f) =>
        (f.username ?? "").toLowerCase().includes(searchText.trim().toLowerCase())
      )
    : friends;

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.friendRow}
      onPress={() => challenge(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.avatar, { borderColor: item.avatar_color || COLORS.primary }]}>
        <Text style={[styles.avatarText, { color: item.avatar_color || COLORS.primary }]}>
          {getInitials(item.username)}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName} numberOfLines={1}>
          @{item.username}
        </Text>
        <Text style={styles.friendMeta}>
          PEAK {item.peak_aura}
        </Text>
      </View>
      <View style={styles.challengeBtn}>
        <Text style={styles.challengeText}>⚔</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPending = ({ item }: { item: PendingRequest }) => {
    const name = item.requester?.username ?? item.from_username ?? "unknown";
    return (
    <View style={styles.pendingRow}>
      <View style={[styles.avatarSmall, { borderColor: COLORS.primary }]}>
        <Text style={[styles.avatarTextSmall, { color: COLORS.primary }]}>
          {getInitials(name)}
        </Text>
      </View>
      <Text style={styles.pendingName} numberOfLines={1}>
        @{name}
      </Text>
      <TouchableOpacity
        style={styles.acceptBtn}
        onPress={() => handleRespond(item.id, "accepted")}
      >
        <Text style={styles.acceptText}>ACCEPT</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.blockBtn}
        onPress={() => handleRespond(item.id, "blocked")}
      >
        <Text style={styles.blockText}>BLOCK</Text>
      </TouchableOpacity>
    </View>
    );
  };

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>SIGN IN TO BUILD YOUR CIRCLE</Text>
      </View>
    );
  }

  // Search row lifted out of FlatList header so the TextInput never remounts
  // when searchText changes (which was what killed the keyboard).
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBlock}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="SEARCH OR LINK UP"
            placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.linkBtn, linking && styles.linkBtnDisabled]}
            onPress={handleLinkUp}
            disabled={linking || !searchText.trim()}
            activeOpacity={0.85}
          >
            {linking ? (
              <ActivityIndicator size="small" color={COLORS.bg} />
            ) : (
              <Text style={styles.linkBtnText}>LINK UP</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {pending.length > 0 && (
        <View style={styles.pendingBlock}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>PENDING</Text>
            <Text style={styles.sectionCount}>
              {String(pending.length).padStart(2, "0")}
            </Text>
          </View>
          {pending.map((item) => (
            <View key={item.id}>{renderPending({ item })}</View>
          ))}
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="small" />
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriend}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionLabel}>YOUR CIRCLE</Text>
              <Text style={styles.sectionCount}>
                {String(filteredFriends.length).padStart(2, "0")}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyLabel}>
                {searchText.trim() ? "NO MATCH" : "NO CIRCLE"}
              </Text>
              <Text style={styles.emptySub}>
                {searchText.trim()
                  ? "TRY LINKING UP WITH THAT USERNAME"
                  : "LINK UP WITH FRIENDS TO COMPARE AURAS"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xxl,
  },

  // ─── Search ───
  searchBlock: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  searchRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    color: COLORS.textPrimary,
    fontFamily: FONTS.mono,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  linkBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  linkBtnDisabled: {
    opacity: 0.4,
  },
  linkBtnText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.bg,
    letterSpacing: 2,
  },

  // ─── Section headers ───
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
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

  // ─── Pending ───
  pendingBlock: {},
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  avatarTextSmall: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  pendingName: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 22,
    includeFontPadding: false,
    paddingTop: 3,
  },
  acceptBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    marginLeft: 6,
  },
  acceptText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.bg,
    letterSpacing: 1.5,
  },
  blockBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 6,
  },
  blockText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },

  // ─── Friends list ───
  list: {
    paddingBottom: 120,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  avatarText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    letterSpacing: -0.5,
    lineHeight: 22,
    includeFontPadding: false,
    paddingTop: 3,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 24,
    includeFontPadding: false,
    paddingTop: 3,
  },
  friendMeta: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  challengeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 214, 10, 0.12)",
    marginLeft: SPACING.sm,
  },
  challengeText: {
    fontSize: 20,
    color: COLORS.primary,
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
  emptyText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 2.5,
  },
});
