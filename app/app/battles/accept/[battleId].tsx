import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { COLORS, SPACING, FONTS } from "../../../src/constants/theme";
import { authedFetch, API_URL } from "../../../src/lib/api";
import { supabase } from "../../../src/lib/supabase";

interface BattleDetail {
  id: string;
  sigma_path: string;
  expires_at: string;
  challenger?: { username: string; battle_wins?: number; battle_losses?: number } | null;
}

function formatPath(path: string): string {
  return path.replace(/_/g, " ").toUpperCase();
}

function hoursLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "EXPIRED";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}H ${mins}M`;
  return `${mins}M`;
}

export default function AcceptScreen() {
  const router = useRouter();
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const [battle, setBattle] = useState<BattleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch(`/battles/${battleId}`);
        const json = await res.json();
        setBattle(json.battle);
      } catch {
        setBattle(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [battleId]);

  const takePhotoAndAccept = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera required", "Battles require a live camera shot.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });
    if (result.canceled) return;
    await submitAccept(result.assets[0].uri);
  };

  const submitAccept = async (uri: string) => {
    setSubmitting(true);
    try {
      const fileName = uri.split("/").pop() || "photo.jpg";
      const fileType = fileName.endsWith(".png") ? "image/png" : "image/jpeg";
      const formData = new FormData();
      formData.append("image", { uri, name: fileName, type: fileType } as any);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in.");

      const res = await fetch(`${API_URL}/battles/${battleId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "multipart/form-data",
          "x-source": "camera",
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Accept failed");

      router.replace(`/battles/reveal/${battleId}` as any);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not accept battle");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!battle) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>BATTLE NOT FOUND</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← BACK</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>INCOMING · THE RING</Text>
        </View>
        <Text style={styles.title}>DEFEND.</Text>
      </View>

      <View style={styles.challengerCard}>
        <Text style={styles.label}>CHALLENGER</Text>
        <Text style={styles.username}>@{battle.challenger?.username ?? "unknown"}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatPath(battle.sigma_path)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta}>{hoursLeft(battle.expires_at)} LEFT</Text>
        </View>
      </View>

      <View style={styles.rulesBox}>
        <Text style={styles.rulesHeader}>⚔ ACCEPT CHALLENGE</Text>
        <Text style={styles.rulesText}>
          · TAKE A CAMERA SHOT NOW{"\n"}
          · AI RATES BOTH FIGHTERS{"\n"}
          · HIGHER AURA WINS{"\n"}
          · RESULTS REVEAL IMMEDIATELY
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={[styles.cta, submitting && styles.ctaDisabled]}
        onPress={takePhotoAndAccept}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.bg} />
        ) : (
          <Text style={styles.ctaText}>TAKE SHOT · FIGHT BACK</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.declineBtn}
        onPress={() =>
          Alert.alert("Decline?", "This challenge will be rejected.", [
            { text: "CANCEL", style: "cancel" },
            {
              text: "DECLINE",
              style: "destructive",
              onPress: async () => {
                try {
                  await authedFetch(`/battles/${battleId}/decline`, { method: "POST" });
                  router.replace("/(tabs)/battles" as any);
                } catch {
                  Alert.alert("Error", "Could not decline.");
                }
              },
            },
          ])
        }
      >
        <Text style={styles.declineText}>DECLINE</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 2.5,
    marginBottom: SPACING.lg,
  },

  backBtn: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  backText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
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
    fontSize: 80,
    lineHeight: 72,
    color: COLORS.textPrimary,
    letterSpacing: -3,
  },

  challengerCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 214, 10, 0.06)",
  },
  label: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  username: {
    fontFamily: FONTS.display,
    fontSize: 36,
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  meta: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
  },
  metaDot: {
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
  },

  rulesBox: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  rulesHeader: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 2.5,
    marginBottom: SPACING.sm,
  },
  rulesText: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    lineHeight: 18,
  },

  cta: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: COLORS.bg,
    letterSpacing: -1,
  },
  declineBtn: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  declineText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
});
