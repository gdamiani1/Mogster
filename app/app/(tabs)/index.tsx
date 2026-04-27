import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, FONTS } from "../../src/constants/theme";
import { SIGMA_PATHS, SigmaPathId } from "../../src/constants/paths";
import { useAuthStore } from "../../src/store/authStore";
import { supabase } from "../../src/lib/supabase";
import { authedFetch } from "../../src/lib/api";
import { scheduleStreakSaver } from "../../src/lib/notifications";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import AuraResultCard from "../../src/components/AuraResultCard";
import Wordmark from "../../src/components/design/Wordmark";
import { DailyChallengeBanner } from "../../src/components/daily/DailyChallengeBanner";

import { API_URL, ModerationError } from "../../src/lib/api";
import { ModerationRejectCard } from "../../src/components/ModerationRejectCard";
import { LensPicker } from "../../src/components/LensPicker";
import { capture } from "../../src/lib/analytics";
import DossierLoadingScreen from "../../src/components/DossierLoadingScreen";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const LOADING_MESSAGES = [
  "Analyzing your aura fr fr...",
  "Computing the mog differential...",
  "Checking if you're HIM...",
  "The AI is cooking rn...",
  "Calibrating the vibe check...",
  "Reading your energy field...",
  "Quantifying the drip...",
];

interface AuraStat {
  label: string;
  score: number;
}

interface AuraResult {
  aura_score: number;
  personality_read: string;
  roast: string;
  aura_color: { primary: string; secondary: string };
  tier: string;
  stats?: AuraStat[];
}

async function checkAura(
  imageUri: string,
  sigmaPath: string,
  token: string
): Promise<AuraResult> {
  const fileName = imageUri.split("/").pop() || "photo.jpg";
  const fileType = fileName.endsWith(".png") ? "image/png" : "image/jpeg";

  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    name: fileName,
    type: fileType,
  } as any);

  const response = await fetch(`${API_URL}/aura/check`, {
    method: "POST",
    headers: {
      "x-sigma-path": sigmaPath,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 403 && err.error === "AURA_UNREADABLE") {
      throw new ModerationError(err);
    }
    throw new Error(err.error || `API error: ${response.status}`);
  }

  return response.json();
}

export default function VibeCheckScreen() {
  const { profile } = useAuthStore();
  const [selectedPath, setSelectedPath] = useState<SigmaPathId>(
    (profile?.current_path as SigmaPathId) || SIGMA_PATHS[0].id
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [result, setResult] = useState<AuraResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modReject, setModReject] = useState<ModerationError | null>(null);
  const [lensPickerOpen, setLensPickerOpen] = useState(false);
  const [showingLatest, setShowingLatest] = useState(false); // true = viewing saved latest, false = fresh check
  const [latestCheckId, setLatestCheckId] = useState<string | null>(null);
  const [latestIsSaved, setLatestIsSaved] = useState(false);
  const [challengeCompletedToday, setChallengeCompletedToday] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const msgFadeAnim = useRef(new Animated.Value(1)).current;

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      Animated.timing(msgFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        Animated.timing(msgFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  // Pulse animation for loading
  useEffect(() => {
    if (!loading) {
      pulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [loading]);

  // Glow animation for main CTA
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  // Entry fade
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Slide in result
  useEffect(() => {
    if (result) {
      slideAnim.setValue(300);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }).start();
    }
  }, [result]);

  const pickImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      setError("Need camera roll access to check your aura fr");
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (pickerResult.canceled) return;
    const uri = pickerResult.assets[0].uri;
    setImageUri(uri);
    setError(null);
    setResult(null);
    setShowingLatest(false);
    submitAuraCheck(uri);
  };

  const takePhoto = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      setError("Need camera access to check your aura fr");
      return;
    }
    const pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (pickerResult.canceled) return;
    const uri = pickerResult.assets[0].uri;
    setImageUri(uri);
    setError(null);
    setResult(null);
    setShowingLatest(false);
    submitAuraCheck(uri);
  };

  const submitAuraCheck = async (uri: string) => {
    setLoading(true);
    setLoadingMsgIndex(0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not signed in. Sign in again fr.");
      }
      const data = await checkAura(uri, selectedPath, session.access_token);
      setResult(data);
      setShowingLatest(false);
      // Fresh checks aren't saved by default; capture id for the bookmark button
      setLatestCheckId((data as any).check_id || null);
      setLatestIsSaved(false);
      if ((data as any).challenge_completed === true) {
        setChallengeCompletedToday(true);
      }
      // Reschedule streak-saver ping for tomorrow 22:00 (fire-and-forget)
      void scheduleStreakSaver();
    } catch (err: any) {
      if (err instanceof ModerationError) {
        setModReject(err);
      } else {
        setError(err.message || "Something went wrong no cap");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImageUri(null);
    setResult(null);
    setError(null);
    setModReject(null);
    setLoading(false);
    setShowingLatest(false);
    setLatestCheckId(null);
    setLatestIsSaved(false);
  };

  // Fetch the latest aura check from history and display it
  const fetchLatest = async () => {
    if (!profile?.id) return;
    try {
      const res = await authedFetch(`/aura/history/${profile.id}`);
      const json = await res.json();
      const latest = (json.checks || [])[0];
      if (latest) {
        setResult({
          aura_score: latest.aura_score,
          personality_read: latest.personality_read,
          roast: latest.roast,
          aura_color: latest.aura_color,
          tier: latest.tier,
          stats: latest.stats,
        });
        setImageUri(latest.image_url);
        setLatestCheckId(latest.id);
        setLatestIsSaved(latest.is_saved === true);
        setShowingLatest(true);
      }
      // Derive today's challenge-completion state from any matching check today
      const todayISO = new Date().toISOString().split("T")[0];
      const doneToday = (json.checks || []).some(
        (c: any) =>
          c.challenge_completed === true &&
          typeof c.created_at === "string" &&
          c.created_at.startsWith(todayISO)
      );
      setChallengeCompletedToday(doneToday);
    } catch {
      // Silent fail — just show empty state
    }
  };

  const toggleLatestSave = async () => {
    if (!latestCheckId) return;
    const newSaved = !latestIsSaved;
    setLatestIsSaved(newSaved); // optimistic
    try {
      await authedFetch(`/aura/check/${latestCheckId}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: newSaved }),
      });
    } catch {
      setLatestIsSaved(!newSaved); // revert
    }
  };

  // Load latest on mount + whenever screen is focused (only if nothing fresh)
  useFocusEffect(
    React.useCallback(() => {
      // Don't override a fresh result the user is looking at
      if (!result || showingLatest) {
        fetchLatest();
      }
    }, [profile?.id])
  );

  // Listen for tab press — when user taps Vibe Check while already on it AND
  // a result is showing, reset to the home pick-lens view. Do NOT auto-open
  // anything; user explicitly taps GET COOKED to start a new check.
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener("tabPress", () => {
      if (isFocused && (result || imageUri)) {
        setResult(null);
        setImageUri(null);
        setShowingLatest(false);
        setLatestCheckId(null);
        setLatestIsSaved(false);
        setError(null);
      }
    });
    return unsubscribe;
  }, [navigation, isFocused, result, imageUri]);

  const handlePathSelect = (pathId: SigmaPathId) => {
    setSelectedPath(pathId);
    useAuthStore.getState().setPath(pathId);
    capture("lens_picked", { sigma_path: pathId });
  };

  // ─── RESULT VIEW ───
  if (result && !loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.resultScroll}
          showsVerticalScrollIndicator={false}
        >
          {showingLatest && (
            <View style={styles.latestBanner}>
              <Text style={styles.latestBannerText}>{"◉ LATEST AURA"}</Text>
            </View>
          )}
          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
            <AuraResultCard
              result={result}
              imageUri={imageUri}
              sigmaPath={selectedPath}
              username={profile?.username}
              isSaved={latestIsSaved}
              onToggleSave={latestCheckId ? toggleLatestSave : undefined}
            />
          </Animated.View>
          <Text style={styles.tabHint}>tap the Vibe Check tab again for a new aura</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── LOADING VIEW — DOSSIER UNDER REVIEW ───
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <DossierLoadingScreen imageUri={imageUri} sigmaPath={selectedPath} />
      </SafeAreaView>
    );
  }

  // ─── MAIN VIEW ───
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
        {/* Editorial header */}
        <View style={styles.headerRow}>
          <Wordmark size={38} />
          <View style={styles.metaRight}>
            <Text style={styles.metaText}>ISSUE №01</Text>
            <Text style={styles.metaTextAccent}>{todayStamp()}</Text>
          </View>
        </View>

        <DailyChallengeBanner completed={challengeCompletedToday} />

        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>01 / PICK YOUR LENS</Text>
        </View>

        {/* Selected lens tile — taps to open modal */}
        <TouchableOpacity
          style={styles.lensTile}
          onPress={() => setLensPickerOpen(true)}
          activeOpacity={0.85}
        >
          <View style={styles.lensTileHeader}>
            <Text style={styles.lensTileNum}>
              {String(
                SIGMA_PATHS.findIndex((p) => p.id === selectedPath) + 1
              ).padStart(2, "0")}
            </Text>
            <Text style={styles.lensTileName} numberOfLines={1}>
              {SIGMA_PATHS.find((p) => p.id === selectedPath)?.label.toUpperCase() ??
                ""}
            </Text>
            <Text style={styles.lensTileChevron}>→</Text>
          </View>
          <Text style={styles.lensTileDesc} numberOfLines={2}>
            {SIGMA_PATHS.find((p) => p.id === selectedPath)?.description ?? ""}
          </Text>
        </TouchableOpacity>

        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>02 / DROP THE PIC</Text>
        </View>

        {/* Big CTA — opens native camera */}
        <View style={styles.ctaArea}>
          <TouchableOpacity
            onPress={takePhoto}
            activeOpacity={0.85}
            style={styles.ctaBlock}
          >
            <Text style={styles.ctaHeadline}>GET{"\n"}COOKED.</Text>
            <View style={styles.ctaMeta}>
              <Text style={styles.ctaArrow}>→</Text>
              <Text style={styles.ctaMetaText}>TAP TO OPEN CAMERA</Text>
            </View>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {modReject && (
            <ModerationRejectCard
              copyTier={modReject.copyTier}
              hardLocked={modReject.hardLocked}
              onRetry={() => setModReject(null)}
              onDismiss={() => setModReject(null)}
            />
          )}

          {/* Gallery fallback */}
          <TouchableOpacity
            style={styles.gallerySecondary}
            onPress={pickImage}
            activeOpacity={0.7}
          >
            <Text style={styles.gallerySecondaryText}>
              OR PICK FROM GALLERY →
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <LensPicker
        visible={lensPickerOpen}
        selected={selectedPath}
        onSelect={handlePathSelect}
        onClose={() => setLensPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function todayStamp(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}.${String(d.getFullYear()).slice(2)}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  resultScroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 120,
  },
  tabHint: {
    fontFamily: FONTS.mono,
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: "center",
    marginTop: SPACING.md,
    letterSpacing: 1.5,
  },

  // ─── Editorial header ───
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 214, 10, 0.15)",
  },
  metaRight: {
    alignItems: "flex-end",
  },
  metaText: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  metaTextAccent: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 2,
    marginTop: 2,
  },

  // ─── Eyebrow ───
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  eyebrowLine: {
    width: 24,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  eyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 2.5,
  },

  // ─── Lens tile — taps to open LensPicker modal ───
  lensTile: {
    backgroundColor: COLORS.ink2,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  lensTileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  lensTileNum: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.ghost,
    letterSpacing: 2.2,
  },
  lensTileName: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.paper,
    letterSpacing: -0.3,
  },
  lensTileChevron: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.hazard,
  },
  lensTileDesc: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.ghost,
    letterSpacing: 0.4,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  // legacy unused
  pathStar: {
    position: "absolute",
    top: 8,
    right: 10,
    fontSize: 12,
    color: COLORS.bg,
  },

  // ─── CTA ───
  ctaArea: {
    marginTop: SPACING.md,
  },
  ctaBlock: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 24,
    position: "relative",
  },
  ctaHeadline: {
    fontFamily: FONTS.display,
    fontSize: 80,
    lineHeight: 92,
    includeFontPadding: false,
    paddingTop: 10,
    color: COLORS.bg,
    letterSpacing: -3,
  },
  ctaMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(10, 10, 10, 0.2)",
  },
  ctaArrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 22,
    color: COLORS.bg,
  },
  ctaMetaText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.bg,
    letterSpacing: 2,
  },
  gallerySecondary: {
    alignSelf: "center",
    paddingVertical: SPACING.sm,
    marginTop: 6,
  },
  gallerySecondaryText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },

  // ─── Source selector ───
  sourceRow: {
    flexDirection: "row",
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  sourceDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  sourceIcon: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceIconBox: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: COLORS.textSecondary,
  },
  sourceIconCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.textSecondary,
  },
  sourceLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },

  // ─── Error ───
  errorBox: {
    backgroundColor: "rgba(255, 59, 48, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginTop: SPACING.sm,
  },
  errorText: {
    fontFamily: FONTS.mono,
    color: COLORS.danger,
    fontSize: 11,
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // ─── Loading ───
  loadingView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  loadingImageWrapper: {
    marginBottom: SPACING.xl,
  },
  loadingGlowBorder: {
    padding: 4,
    borderRadius: 82,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  loadingImage: {
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 3,
    borderColor: COLORS.bg,
  },
  loadingText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 6,
    marginTop: SPACING.lg,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    opacity: 0.5,
  },

  // ─── Latest banner ───
  latestBanner: {
    alignSelf: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 8,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.primary + "20",
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  latestBannerText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },

});
