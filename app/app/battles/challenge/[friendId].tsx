import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { COLORS, SPACING, FONTS } from "../../../src/constants/theme";
import { SIGMA_PATHS, SigmaPathId } from "../../../src/constants/paths";
import { authedFetch, API_URL } from "../../../src/lib/api";
import { supabase } from "../../../src/lib/supabase";

export default function ChallengeScreen() {
  const router = useRouter();
  const { friendId, friendUsername } = useLocalSearchParams<{
    friendId: string;
    friendUsername?: string;
  }>();

  const [opponentUsername, setOpponentUsername] = useState<string>(friendUsername ?? "");
  const [selectedPath, setSelectedPath] = useState<SigmaPathId>("auramaxxing");
  const [submitting, setSubmitting] = useState(false);

  // If username wasn't passed, fetch it
  useEffect(() => {
    if (opponentUsername || !friendId) return;
    (async () => {
      try {
        const res = await authedFetch(`/profiles/${friendId}`);
        const json = await res.json();
        if (json?.profile?.username) setOpponentUsername(json.profile.username);
      } catch {}
    })();
  }, [friendId, opponentUsername]);

  const takePhotoAndChallenge = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera required", "Battles require a live camera shot. No gallery uploads.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    await submitChallenge(uri);
  };

  const submitChallenge = async (uri: string) => {
    if (!opponentUsername) {
      Alert.alert("Error", "No opponent found.");
      return;
    }
    setSubmitting(true);
    try {
      const fileName = uri.split("/").pop() || "photo.jpg";
      const fileType = fileName.endsWith(".png") ? "image/png" : "image/jpeg";

      const formData = new FormData();
      formData.append("image", { uri, name: fileName, type: fileType } as any);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in.");

      const res = await fetch(`${API_URL}/battles/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "multipart/form-data",
          "x-source": "camera",
          "x-sigma-path": selectedPath,
          "x-opponent-username": opponentUsername,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Battle creation failed");

      Alert.alert(
        "CHALLENGE SENT",
        `@${opponentUsername} has 24h to respond.`,
        [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)/battles" as any),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not send challenge");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrow}>CHALLENGE · THE RING</Text>
          </View>
          <Text style={styles.title}>VS</Text>
          <Text style={styles.opponent}>@{opponentUsername || "..."}</Text>
        </View>

        {/* Path picker */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.sectionLabel}>01 / PICK YOUR LENS</Text>
          </View>
          <View style={styles.pathGrid}>
            {SIGMA_PATHS.map((p, idx) => {
              const active = selectedPath === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pathTile, active && styles.pathTileActive]}
                  onPress={() => setSelectedPath(p.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pathNum, active && styles.pathNumActive]}>
                    {String(idx + 1).padStart(2, "0")}
                  </Text>
                  <Text style={[styles.pathLabel, active && styles.pathLabelActive]}>
                    {p.label.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Rules */}
        <View style={styles.rulesBox}>
          <Text style={styles.rulesHeader}>⚔ RULES</Text>
          <Text style={styles.rulesText}>
            · CAMERA ONLY — NO GALLERY UPLOADS{"\n"}
            · OPPONENT HAS 24H TO RESPOND{"\n"}
            · WINNER = HIGHER AURA SCORE{"\n"}
            · ONE-HIT K.O. NO REMATCHES FOR 24H
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, submitting && styles.ctaDisabled]}
          onPress={takePhotoAndChallenge}
          disabled={submitting || !opponentUsername}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text style={styles.ctaText}>TAKE SHOT · THROW HANDS</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

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
    fontSize: 96,
    lineHeight: 88,
    color: COLORS.textPrimary,
    letterSpacing: -4,
  },
  opponent: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: COLORS.primary,
    letterSpacing: -1,
    marginTop: 4,
  },

  section: {
    paddingTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
  },
  pathGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  pathTile: {
    width: "48%",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  pathTileActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pathNum: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  pathNumActive: { color: COLORS.bg },
  pathLabel: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  pathLabelActive: { color: COLORS.bg },

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
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: COLORS.bg,
    letterSpacing: -1,
  },
});
