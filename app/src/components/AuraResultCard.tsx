import React, { useRef } from "react";
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
import { COLORS, SPACING, FONTS, displayText } from "../constants/theme";
import GrainOverlay from "./design/GrainOverlay";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9));

// ─── Lazy view-shot + media-library ───
let captureRefFn: any = null;
let MediaLibrary: any = null;
try {
  captureRefFn = require("react-native-view-shot").captureRef;
} catch {}
try {
  MediaLibrary = require("expo-media-library");
} catch {}

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

function getTierLabel(tier: string): string {
  const upper = tier.toUpperCase();
  if (upper.includes("SKIBIDI")) return "SKIBIDI LEGEND";
  if (upper.includes("MOG GOD")) return "MOG GOD";
  if (upper.includes("SIGMA")) return "SIGMA";
  if (upper.includes("HIM") || upper.includes("HER")) return "HIM / HER";
  if (upper.includes("COOK")) return "COOKING";
  if (upper.includes("6") || upper.includes("SEVEN")) return "SIX — SEVEN";
  if (upper.includes("NPC")) return "NPC";
  return "DOWN BAD";
}

function pathStamp(path?: string): string {
  if (!path) return "• AURAMAXXING";
  const map: Record<string, string> = {
    auramaxxing: "• AURAMAXXING",
    looksmaxxing: "• LOOKSMAXXING",
    mogger_mode: "• MOGGER MODE",
    rizzmaxxing: "• RIZZMAXXING",
    statusmaxxing: "• STATUSMAXXING",
    brainrot_mode: "• BRAINROT MODE",
    sigma_grindset: "• SIGMA GRIND",
  };
  return map[path] ?? path.toUpperCase();
}

function issueNumber(score: number): string {
  const day = new Date();
  const seed = score + day.getDate() * 37 + day.getMonth() * 101;
  return `N°${String(seed).padStart(5, "0")}`;
}

function todayStamp(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}.${String(d.getFullYear()).slice(2)}`;
}

// Truncate a stat label to a 3-4 letter abbreviation for the column row.
function abbrev(label: string): string {
  const upper = label.toUpperCase();
  if (upper.length <= 4) return upper;
  // Strip vowels after first char until we fit, fall back to first 4
  const vowelsStripped = upper.charAt(0) + upper.slice(1).replace(/[AEIOU]/g, "");
  return vowelsStripped.length <= 4 ? vowelsStripped : upper.slice(0, 4);
}

export default function AuraResultCard({
  result,
  imageUri,
  sigmaPath,
  username,
  isSaved,
  onToggleSave,
}: AuraResultCardProps) {
  const cardRef = useRef<View>(null);
  const tierLabel = getTierLabel(result.tier);
  const stats = (result.stats || []).slice(0, 5);

  const captureCard = async (): Promise<string | null> => {
    try {
      if (!captureRefFn || !cardRef.current) return null;
      return await captureRefFn(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
    } catch (e) {
      console.warn("Card capture failed:", e);
      return null;
    }
  };

  const handleShare = async () => {
    const uri = await captureCard();
    const message = `I scored ${result.aura_score} on Mogster — ${result.tier}\n\n"${result.roast}"`;
    try {
      if (uri) {
        await Share.share({ url: uri, message });
      } else {
        await Share.share({ message });
      }
    } catch (_) {}
  };

  const handleDownload = async () => {
    try {
      if (!MediaLibrary) {
        Alert.alert("Not available", "Camera roll access not available.");
        return;
      }
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Need access", "Allow camera roll to save the card");
        return;
      }
      const uri = await captureCard();
      if (!uri) {
        Alert.alert("L detected", "Couldn't capture card. Try a screenshot instead.");
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("W secured", "Card saved to your camera roll");
    } catch (_) {
      Alert.alert("L detected", "Failed to save card");
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Card — ref for capture */}
      <View ref={cardRef} collapsable={false} style={styles.captureArea}>
        <View style={styles.card}>
          {/* Photo — bleeds 65% from top */}
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.photo}
              resizeMode="cover"
            />
          )}

          {/* Photo → ink fade */}
          <LinearGradient
            colors={[
              "transparent",
              "rgba(10,10,10,0.94)",
              COLORS.ink,
            ]}
            locations={[0.28, 0.68, 1]}
            style={styles.gradient}
          />

          <GrainOverlay opacity={0.06} />

          {/* Crop marks — 18px hazard hairlines, all 4 corners */}
          <View style={[styles.cropMark, styles.cropTL]} />
          <View style={[styles.cropMark, styles.cropTR]} />
          <View style={[styles.cropMark, styles.cropBL]} />
          <View style={[styles.cropMark, styles.cropBR]} />

          {/* Top strip — wordmark left, username (or issue/date) right */}
          <View style={styles.topStrip}>
            <Text style={styles.wordmark}>
              MOGSTER<Text style={styles.wordmarkDot}>.</Text>
            </Text>
            <Text style={styles.topMeta}>
              {username ? `@${username.toUpperCase()}` : `${issueNumber(result.aura_score)} · ${todayStamp()}`}
            </Text>
          </View>

          {/* Path stamp — rotated -2deg, hazard fill */}
          <View style={styles.pathStamp}>
            <Text style={styles.pathStampText}>{pathStamp(sigmaPath)}</Text>
          </View>

          {/* Bottom editorial block */}
          <View style={styles.bottomBlock}>
            <Text style={styles.auraEyebrow}>▌ AURA</Text>

            <Text
              style={styles.megaScore}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {String(result.aura_score)}
            </Text>

            <Text style={styles.tierLabel}>{tierLabel}</Text>

            <View style={styles.divider} />

            {/* 5 stat columns */}
            {stats.length > 0 && (
              <View style={styles.statsRow}>
                {stats.map((stat) => (
                  <View key={stat.label} style={styles.statCol}>
                    <Text style={styles.statValue}>{stat.score}</Text>
                    <Text style={styles.statLabel}>{abbrev(stat.label)}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.roast} numberOfLines={3}>
              &quot;{result.roast.toLowerCase()}&quot;
            </Text>
          </View>
        </View>
      </View>

      {/* Actions — outside the captured card */}
      <View style={styles.actions}>
        {onToggleSave && (
          <TouchableOpacity
            style={[
              styles.iconBtn,
              isSaved && { backgroundColor: COLORS.hazard, borderColor: COLORS.hazard },
            ]}
            onPress={onToggleSave}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.iconBtnIcon,
                { color: isSaved ? COLORS.ink : COLORS.paperMute },
              ]}
            >
              {isSaved ? "★" : "☆"}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Text style={styles.shareBtnText}>↗ SHARE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleDownload}
          activeOpacity={0.85}
        >
          <Text style={[styles.iconBtnIcon, { color: COLORS.paperMute }]}>↓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const CROP = 18;

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },

  captureArea: {
    width: CARD_WIDTH,
    overflow: "hidden",
  },

  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: COLORS.ink2,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "relative",
    overflow: "hidden",
  },

  photo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "75%",
  },

  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  // Crop marks — 18px L/T/R/B 1px hazard
  cropMark: {
    position: "absolute",
    width: CROP,
    height: CROP,
    borderColor: COLORS.hazard,
  },
  cropTL: { top: 8, left: 8, borderTopWidth: 1, borderLeftWidth: 1 },
  cropTR: { top: 8, right: 8, borderTopWidth: 1, borderRightWidth: 1 },
  cropBL: { bottom: 8, left: 8, borderBottomWidth: 1, borderLeftWidth: 1 },
  cropBR: { bottom: 8, right: 8, borderBottomWidth: 1, borderRightWidth: 1 },

  topStrip: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 4,
  },
  wordmark: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: COLORS.paper,
    letterSpacing: -0.3,
  },
  wordmarkDot: { color: COLORS.hazard },
  topMeta: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.paperMute,
    letterSpacing: 2,
  },

  pathStamp: {
    position: "absolute",
    top: 56,
    left: 14,
    backgroundColor: COLORS.hazard,
    paddingHorizontal: 8,
    paddingVertical: 4,
    transform: [{ rotate: "-2deg" }],
    zIndex: 4,
  },
  pathStampText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.ink,
    letterSpacing: 1.5,
  },

  bottomBlock: {
    position: "absolute",
    bottom: 18,
    left: 14,
    right: 14,
    zIndex: 4,
  },
  auraEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.hazard,
    letterSpacing: 3,
    marginBottom: 4,
  },
  megaScore: {
    ...displayText(112),
    color: COLORS.paper,
    letterSpacing: -6,
    textTransform: "uppercase",
  },
  tierLabel: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.hazard,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: -4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.hazard25,
    marginTop: 10,
    marginBottom: 8,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.paper,
    letterSpacing: -0.5,
    paddingTop: 2,
  },
  statLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    color: COLORS.paperMute,
    letterSpacing: 1.5,
    marginTop: 2,
  },

  roast: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.paperMute,
  },

  // Actions outside capture
  actions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    alignItems: "center",
    width: "100%",
  },
  shareBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.hazard,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnText: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.ink,
    letterSpacing: 4,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.ink2,
  },
  iconBtnIcon: {
    fontSize: 22,
    fontFamily: FONTS.monoBold,
  },
});
