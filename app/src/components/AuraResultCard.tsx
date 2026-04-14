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
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { COLORS, SPACING } from "../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const IMAGE_HEIGHT = CARD_WIDTH; // 1:1 square image

interface AuraResult {
  aura_score: number;
  personality_read: string;
  roast: string;
  aura_color: { primary: string; secondary: string };
  tier: string;
}

interface AuraResultCardProps {
  result: AuraResult;
  imageUri?: string | null;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export default function AuraResultCard({
  result,
  imageUri,
  isSaved,
  onToggleSave,
}: AuraResultCardProps) {
  const viewShotRef = useRef<ViewShot>(null);

  const handleShare = async () => {
    try {
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      await Share.share({
        url: uri,
        message: `I scored ${result.aura_score} aura (${result.tier}) on Aurate\n\n"${result.roast}"`,
      });
    } catch (_) {}
  };

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Need access", "Allow camera roll to download your aura card fr");
        return;
      }
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("W secured", "Card downloaded to camera roll");
    } catch (err) {
      Alert.alert("L detected", "Failed to download. Try again ngl");
    }
  };

  const { primary, secondary } = result.aura_color;

  return (
    <View style={styles.wrapper}>
      <ViewShot
        ref={viewShotRef}
        options={{ format: "png", quality: 1 }}
        style={styles.captureArea}
      >
        <View style={[styles.card, { borderColor: primary + "40" }]}>
          {/* Top: 1:1 Image */}
          <View style={styles.imageSection}>
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={styles.photo}
                resizeMode="cover"
              />
            )}
            {/* Gradient fade from image into overlay */}
            <LinearGradient
              colors={["transparent", "rgba(10,10,15,0.3)", "rgba(10,10,15,0.8)", "rgba(10,10,15,0.95)"]}
              locations={[0, 0.4, 0.7, 1]}
              style={styles.imageFade}
            />
            {/* Tier badge on image */}
            <View style={styles.tierPosition}>
              <View style={[styles.tierBadge, { backgroundColor: primary + "CC" }]}>
                <Text style={styles.tierText}>{result.tier}</Text>
              </View>
            </View>
          </View>

          {/* Bottom: 60% overlay with score + text */}
          <View style={styles.overlay}>
            {/* Score + aura label */}
            <View style={styles.scoreRow}>
              <Text style={[styles.score, { color: primary }]}>{result.aura_score}</Text>
              <Text style={styles.scoreLabel}>AURA</Text>
            </View>

            {/* Glow line */}
            <LinearGradient
              colors={[primary, secondary, primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.glowLine}
            />

            {/* Roast */}
            <Text style={styles.roast}>"{result.roast}"</Text>

            {/* Personality read */}
            <Text style={styles.personality}>{result.personality_read}</Text>

            {/* Watermark */}
            <Text style={styles.watermark}>aurate</Text>
          </View>
        </View>
      </ViewShot>

      {/* Action buttons */}
      <View style={styles.actions}>
        {onToggleSave && (
          <TouchableOpacity
            style={[
              styles.iconBtn,
              isSaved && { backgroundColor: COLORS.warning + "20", borderColor: COLORS.warning + "60" },
            ]}
            onPress={onToggleSave}
            activeOpacity={0.7}
          >
            <Text style={[styles.iconBtnIcon, { color: isSaved ? COLORS.warning : COLORS.textSecondary }]}>
              {isSaved ? "★" : "☆"}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: primary + "20", borderColor: primary + "40" }]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionIcon, { color: primary }]}>{"↗"}</Text>
          <Text style={[styles.actionText, { color: primary }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleDownload}
          activeOpacity={0.8}
        >
          <Text style={[styles.iconBtnIcon, { color: COLORS.textSecondary }]}>{"↓"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  captureArea: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: "hidden",
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
  },

  // ─── Image section (top 40%) ───
  imageSection: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  imageFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: IMAGE_HEIGHT * 0.5,
  },
  tierPosition: {
    position: "absolute",
    top: SPACING.md,
    left: SPACING.md,
  },
  tierBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 12,
  },
  tierText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // ─── Overlay section (bottom 60%) ───
  overlay: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: "transparent",
    marginTop: -(IMAGE_HEIGHT * 0.3),
  },

  // Score
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  score: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 4,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // Glow line
  glowLine: {
    height: 2,
    borderRadius: 1,
    marginBottom: SPACING.md,
    opacity: 0.8,
  },

  // Roast
  roast: {
    fontSize: 16,
    fontWeight: "700",
    fontStyle: "italic",
    color: "#fff",
    lineHeight: 23,
    marginBottom: SPACING.md,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },

  // Personality
  personality: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 19,
    marginBottom: SPACING.md,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // Watermark
  watermark: {
    fontSize: 11,
    fontWeight: "300",
    color: COLORS.textMuted,
    letterSpacing: 3,
    textAlign: "right",
    opacity: 0.5,
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
    alignItems: "center",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    fontSize: 18,
    fontWeight: "800",
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnIcon: {
    fontSize: 22,
    fontWeight: "700",
  },
});
