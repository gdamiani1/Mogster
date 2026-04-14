import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import GrainOverlay from "./design/GrainOverlay";
import CropMarks from "./design/CropMarks";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9)); // 9:16 card ratio

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

interface AuraResultCardProps {
  result: AuraResult;
  imageUri?: string | null;
  sigmaPath?: string;
  username?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

// Tier color mapping — each tier gets its own treatment
function getTierTreatment(tier: string): {
  color: string;
  label: string;
} {
  const upper = tier.toUpperCase();
  if (upper.includes("SKIBIDI")) return { color: "#FFFFFF", label: "SKIBIDI LEGEND" };
  if (upper.includes("MOG GOD")) return { color: COLORS.primary, label: "MOG GOD ✦" };
  if (upper.includes("SIGMA")) return { color: COLORS.primary, label: "SIGMA" };
  if (upper.includes("HIM") || upper.includes("HER")) return { color: COLORS.primary, label: "HIM / HER" };
  if (upper.includes("COOK")) return { color: "#FFB84D", label: "COOKING" };
  if (upper.includes("6") || upper.includes("SEVEN")) return { color: "#C9A14A", label: "SIX — SEVEN" };
  if (upper.includes("NPC")) return { color: "#8A8878", label: "NPC" };
  return { color: "#6B6B5E", label: "DOWN BAD" };
}

// Pretty-print sigma path for stamp
function pathStamp(path?: string): string {
  if (!path) return "◉ AURAMAXXING";
  const map: Record<string, string> = {
    auramaxxing: "◉ AURAMAXXING",
    looksmaxxing: "◆ LOOKSMAXXING",
    mogger_mode: "👁 MOGGER MODE",
    rizzmaxxing: "♥ RIZZMAXXING",
    statusmaxxing: "$ STATUSMAXXING",
    brainrot_mode: "✦ BRAINROT MODE",
    sigma_grindset: "▲ SIGMA GRIND",
  };
  return map[path] ?? path.toUpperCase();
}

function issueNumber(score: number): string {
  // Deterministic 5-digit issue # from score + date
  const day = new Date();
  const seed = score + day.getDate() * 37 + day.getMonth() * 101;
  return `#${String(seed).padStart(5, "0")}`;
}

function todayStamp(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}.${String(d.getFullYear()).slice(2)}`;
}

export default function AuraResultCard({
  result,
  imageUri,
  sigmaPath,
  username,
  isSaved,
  onToggleSave,
}: AuraResultCardProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const [view, setView] = useState<"roast" | "stats">("roast");
  const hasStats = Array.isArray(result.stats) && result.stats.length > 0;
  const tierTreatment = getTierTreatment(result.tier);

  const handleShare = async () => {
    try {
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      await Share.share({
        url: uri,
        message: `I scored ${result.aura_score} on Mogster — ${result.tier}\n\n"${result.roast}"`,
      });
    } catch (_) {}
  };

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Need access", "Allow camera roll to download the card");
        return;
      }
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("W secured", "Card downloaded to camera roll");
    } catch (err) {
      Alert.alert("L detected", "Failed to download");
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* ─── CAPTURABLE CARD ─── */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: "png", quality: 1 }}
        style={styles.captureArea}
      >
        <View style={styles.card}>
          {/* Photo as background */}
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.photo}
              resizeMode="cover"
            />
          )}

          {/* Gradient fade — transparent top, solid ink at bottom */}
          <LinearGradient
            colors={[
              "transparent",
              "transparent",
              "rgba(10,10,10,0.65)",
              "rgba(10,10,10,0.95)",
              "rgba(10,10,10,0.99)",
            ]}
            locations={[0, 0.25, 0.55, 0.8, 1]}
            style={styles.gradient}
          />

          {/* Grain overlay */}
          <GrainOverlay opacity={0.06} />

          {/* Crop registration marks */}
          <CropMarks color={COLORS.primary} size={18} inset={14} opacity={0.5} />

          {/* Top metadata strip */}
          <View style={styles.topStrip}>
            <View style={styles.pathStamp}>
              <Text style={styles.pathStampText}>{pathStamp(sigmaPath)}</Text>
            </View>
            <View style={styles.issueStamp}>
              <Text style={styles.issueNumber}>{issueNumber(result.aura_score)}</Text>
              <Text style={styles.issueDate}>{todayStamp()}</Text>
            </View>
          </View>

          {/* Bottom editorial block */}
          <View style={styles.bottomBlock}>
            {/* Tier label with hairline */}
            <View style={styles.tierRow}>
              <Text style={[styles.tierLabel, { color: tierTreatment.color }]}>
                {tierTreatment.label}
              </Text>
              <View style={[styles.tierLine, { backgroundColor: tierTreatment.color }]} />
            </View>

            {/* MEGA SCORE */}
            <View style={styles.scoreRow}>
              <Text style={[styles.megaScore, { color: tierTreatment.color }]}>
                {result.aura_score}
              </Text>
              <Text style={styles.auraTag}>AURA</Text>
            </View>

            {/* Content swap: roast or stats */}
            {view === "roast" ? (
              <View style={styles.roastBlock}>
                <Text style={styles.roast}>
                  <Text style={styles.quoteMark}>" </Text>
                  {result.roast.toUpperCase()}
                  <Text style={styles.quoteMark}> "</Text>
                </Text>
              </View>
            ) : (
              <View style={styles.statsBlock}>
                {(result.stats || []).map((stat) => (
                  <View key={stat.label} style={styles.statRow}>
                    <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
                    <View style={styles.statBarBg}>
                      <View
                        style={[
                          styles.statBarFill,
                          { width: `${stat.score}%`, backgroundColor: tierTreatment.color },
                        ]}
                      />
                    </View>
                    <Text style={[styles.statVal, { color: tierTreatment.color }]}>
                      {stat.score}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer: username + brand strip */}
            <View style={styles.footer}>
              <Text style={styles.footerUser}>{username ? `@${username}` : ""}</Text>
              <Text style={styles.footerBrand}>MOGSTER / ISSUE 01</Text>
            </View>
          </View>
        </View>
      </ViewShot>

      {/* ─── VIEW TOGGLE ─── */}
      {hasStats && (
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === "roast" && styles.toggleBtnActive]}
            onPress={() => setView("roast")}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, view === "roast" && styles.toggleTextActive]}>
              ROAST
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === "stats" && styles.toggleBtnActive]}
            onPress={() => setView("stats")}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, view === "stats" && styles.toggleTextActive]}>
              STATS
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── ACTION BUTTONS ─── */}
      <View style={styles.actions}>
        {onToggleSave && (
          <TouchableOpacity
            style={[
              styles.iconBtn,
              isSaved && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
            ]}
            onPress={onToggleSave}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.iconBtnIcon,
                { color: isSaved ? COLORS.bg : COLORS.textSecondary },
              ]}
            >
              {isSaved ? "★" : "☆"}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnIcon}>↗</Text>
          <Text style={styles.primaryBtnText}>SHARE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={handleDownload} activeOpacity={0.8}>
          <Text style={[styles.iconBtnIcon, { color: COLORS.textSecondary }]}>↓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },

  captureArea: {
    width: CARD_WIDTH,
    overflow: "hidden",
  },

  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: COLORS.bgCard,
    position: "relative",
    overflow: "hidden",
  },

  photo: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },

  gradient: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },

  // ─── Top strip ───
  topStrip: {
    position: "absolute",
    top: SPACING.lg + 4,
    left: SPACING.lg + 4,
    right: SPACING.lg + 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 4,
  },
  pathStamp: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    transform: [{ rotate: "-2deg" }],
  },
  pathStampText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.bg,
    letterSpacing: 1.2,
  },
  issueStamp: {
    alignItems: "flex-end",
  },
  issueNumber: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: COLORS.primary,
  },
  issueDate: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.primary,
    opacity: 0.7,
  },

  // ─── Bottom block ───
  bottomBlock: {
    position: "absolute",
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 4,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: -4,
  },
  tierLabel: {
    fontFamily: FONTS.display,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  tierLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },

  // MEGA SCORE
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: SPACING.sm,
  },
  megaScore: {
    fontFamily: FONTS.display,
    fontSize: 128,
    lineHeight: 112,
    letterSpacing: -5,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  auraTag: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 2,
    paddingBottom: 14,
  },

  // ─── Roast block ───
  roastBlock: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 214, 10, 0.2)",
    paddingVertical: 10,
    marginBottom: SPACING.sm,
  },
  roast: {
    fontFamily: FONTS.display,
    fontSize: 15,
    lineHeight: 18,
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  quoteMark: {
    color: COLORS.primary,
    fontSize: 18,
  },

  // ─── Stats block ───
  statsBlock: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 214, 10, 0.2)",
    paddingVertical: 10,
    marginBottom: SPACING.sm,
    gap: 5,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: "rgba(245,241,230,0.65)",
    letterSpacing: 0.8,
    width: 84,
  },
  statBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: "rgba(255, 214, 10, 0.1)",
  },
  statBarFill: {
    height: "100%",
  },
  statVal: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    width: 24,
    textAlign: "right",
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerUser: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: "rgba(245,241,230,0.45)",
    letterSpacing: 1.5,
  },
  footerBrand: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: "rgba(255, 214, 10, 0.5)",
    letterSpacing: 1.5,
  },

  // ─── View toggle ───
  viewToggle: {
    flexDirection: "row",
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "center",
  },
  toggleBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  toggleTextActive: {
    color: COLORS.bg,
  },

  // ─── Actions ───
  actions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    alignItems: "center",
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderWidth: 1,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  primaryBtnIcon: {
    fontFamily: FONTS.monoBold,
    fontSize: 18,
    color: COLORS.bg,
  },
  primaryBtnText: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    letterSpacing: 2.5,
    color: COLORS.bg,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bgCard,
  },
  iconBtnIcon: {
    fontSize: 22,
    fontFamily: FONTS.monoBold,
  },
});
