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
import { COLORS, SPACING } from "../../src/constants/theme";
import { SIGMA_PATHS } from "../../src/constants/paths";
import { useAuthStore } from "../../src/store/authStore";
import { supabase } from "../../src/lib/supabase";
import { authedFetch } from "../../src/lib/api";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import AuraResultCard from "../../src/components/AuraResultCard";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
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

interface AuraResult {
  aura_score: number;
  personality_read: string;
  roast: string;
  aura_color: { primary: string; secondary: string };
  tier: string;
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
    throw new Error(err.error || `API error: ${response.status}`);
  }

  return response.json();
}

export default function VibeCheckScreen() {
  const { profile } = useAuthStore();
  const [selectedPath, setSelectedPath] = useState(
    profile?.current_path || SIGMA_PATHS[0].id
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [result, setResult] = useState<AuraResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showingLatest, setShowingLatest] = useState(false); // true = viewing saved latest, false = fresh check
  const [latestCheckId, setLatestCheckId] = useState<string | null>(null);
  const [latestIsSaved, setLatestIsSaved] = useState(false);

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
    } catch (err: any) {
      setError(err.message || "Something went wrong no cap");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImageUri(null);
    setResult(null);
    setError(null);
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
        });
        setImageUri(latest.image_url);
        setLatestCheckId(latest.id);
        setLatestIsSaved(latest.is_saved === true);
        setShowingLatest(true);
      }
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
  // a result is showing, reset and open the picker for a fresh check
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener("tabPress", (e: any) => {
      if (isFocused && (result || imageUri)) {
        e.preventDefault?.();
        setResult(null);
        setImageUri(null);
        setShowingLatest(false);
        setLatestCheckId(null);
        setLatestIsSaved(false);
        setError(null);
        // Open picker after state has cleared
        setTimeout(() => pickImage(), 50);
      }
    });
    return unsubscribe;
  }, [navigation, isFocused, result, imageUri]);

  const handlePathSelect = (pathId: string) => {
    setSelectedPath(pathId);
    useAuthStore.getState().setPath(pathId);
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
              isSaved={latestIsSaved}
              onToggleSave={latestCheckId ? toggleLatestSave : undefined}
            />
          </Animated.View>
          <Text style={styles.tabHint}>tap the Vibe Check tab again for a new aura</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── LOADING VIEW ───
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingView}>
          {imageUri && (
            <Animated.View
              style={[
                styles.loadingImageWrapper,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.accent, COLORS.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loadingGlowBorder}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={styles.loadingImage}
                />
              </LinearGradient>
            </Animated.View>
          )}
          <Animated.Text
            style={[styles.loadingText, { opacity: msgFadeAnim }]}
          >
            {LOADING_MESSAGES[loadingMsgIndex]}
          </Animated.Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.loadingDot} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── MAIN VIEW ───
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
        {/* Path selector pills - top */}
        <View style={styles.pathSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pathPillRow}
          >
            {SIGMA_PATHS.map((path) => {
              const isSelected = path.id === selectedPath;
              return (
                <TouchableOpacity
                  key={path.id}
                  style={[
                    styles.pathPill,
                    isSelected && styles.pathPillSelected,
                  ]}
                  onPress={() => handlePathSelect(path.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pathPillEmoji}>{path.emoji}</Text>
                  <Text
                    style={[
                      styles.pathPillText,
                      isSelected && styles.pathPillTextSelected,
                    ]}
                  >
                    {path.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Center CTA */}
        <View style={styles.centerArea}>
          <TouchableOpacity
            onPress={pickImage}
            activeOpacity={0.85}
            style={styles.ctaWrapper}
          >
            <Animated.View
              style={[styles.ctaGlow, { opacity: glowAnim }]}
            />
            <LinearGradient
              colors={[COLORS.primary, "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaIcon}>{"+"}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaLabel}>tap to check your aura</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Bottom action buttons */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={pickImage}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomBtnIcon}>{"⊞"}</Text>
            <Text style={styles.bottomBtnLabel}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={takePhoto}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomBtnIcon}>{"◉"}</Text>
            <Text style={styles.bottomBtnLabel}>Camera</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const CTA_SIZE = 100;
const GLOW_SIZE = CTA_SIZE + 40;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  mainContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  resultScroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  tabHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: SPACING.md,
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  // ─── Path pills ───
  pathSection: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  pathPillRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  pathPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pathPillSelected: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderColor: COLORS.primary,
  },
  pathPillEmoji: {
    fontSize: 16,
  },
  pathPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  pathPillTextSelected: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  // ─── Center CTA ───
  centerArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaWrapper: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaGlow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: COLORS.primary,
  },
  ctaButton: {
    width: CTA_SIZE,
    height: CTA_SIZE,
    borderRadius: CTA_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaIcon: {
    fontSize: 40,
    fontWeight: "300",
    color: "#FFFFFF",
    marginTop: -2,
  },
  ctaLabel: {
    marginTop: SPACING.lg,
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },

  // ─── Error ───
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    maxWidth: 280,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: "center",
  },

  // ─── Bottom bar ───
  bottomBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.xl,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  bottomBtn: {
    alignItems: "center",
    gap: 4,
  },
  bottomBtnIcon: {
    fontSize: 24,
  },
  bottomBtnLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
    letterSpacing: 0.3,
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
