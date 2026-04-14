import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS, SPACING } from "../../src/constants/theme";
import AuraResultCard from "../../src/components/AuraResultCard";
import { authedFetch } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";

interface AuraCheck {
  id: string;
  image_url: string;
  sigma_path: string;
  aura_score: number;
  personality_read: string;
  roast: string;
  aura_color: { primary: string; secondary: string; gradient_angle?: number };
  tier: string;
  is_saved: boolean;
  stats?: Array<{ label: string; score: number }>;
  created_at: string;
}

export default function AuraDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [check, setCheck] = useState<AuraCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCheck = async () => {
      if (!profile?.id || !id) return;
      try {
        const res = await authedFetch(`/aura/history/${profile.id}`);
        const json = await res.json();
        const found = (json.checks || []).find((c: AuraCheck) => c.id === id);
        setCheck(found || null);
      } catch {
        setCheck(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCheck();
  }, [id, profile?.id]);

  const toggleSave = async () => {
    if (!check || saving) return;
    setSaving(true);
    const newSaved = !check.is_saved;
    try {
      const res = await authedFetch(`/aura/check/${check.id}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: newSaved }),
      });
      if (res.ok) {
        setCheck({ ...check, is_saved: newSaved });
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!check) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.empty}>Aura check not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backBtn}>{"‹ Back"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleSave} disabled={saving}>
          <Text style={[styles.saveBtn, check.is_saved && { color: COLORS.warning }]}>
            {check.is_saved ? "★ Saved" : "☆ Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AuraResultCard
          result={{
            aura_score: check.aura_score,
            personality_read: check.personality_read,
            roast: check.roast,
            aura_color: check.aura_color,
            tier: check.tier,
            stats: check.stats,
          }}
          imageUri={check.image_url}
          sigmaPath={check.sigma_path}
          username={profile?.username}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  backBtn: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "600",
  },
  saveBtn: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "700",
  },
  scroll: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  empty: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: SPACING.md,
  },
  link: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "700",
  },
});
