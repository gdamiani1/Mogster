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
const CARD_HEIGHT = CARD_WIDTH * 1.78; // 9:16 IG Story ratio — tall enough for all text

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
}

export default function AuraResultCard({
  result,
  imageUri,
}: AuraResultCardProps) {
  const viewShotRef = useRef<ViewShot>(null);

  const handleShare = async () => {
    try {
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      await Share.share({
        url: uri,
        message: `I scored ${result.aura_score} aura (${result.tier}) on Aurate 🔮\n\n"${result.roast}"`,
      });
    } catch (_) {}
  };

  const handleSave = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Need access", "Allow camera roll to save your aura card fr");
        return;
      }
      if (!viewShotRef.current?.capture) return;
      const uri = await viewShotRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("W", "Aura card saved to camera roll 🔮");
    } catch (err) {
      Alert.alert("L", "Failed to save. Try again ngl");
    }
  };

  const { primary, secondary } = result.aura_color;

  return (
    <View style={styles.wrapper}>
      {/* Capturable card — photo background with overlay */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: "png", quality: 1 }}
        style={styles.captureArea}
      >
        <View style={[styles.card, { borderColor: primary + "40" }]}>
          {/* Photo as full background */}
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.backgroundImage}
              resizeMode="cover"
            />
          )}

          {/* Gradient overlay — dark at bottom for text readability */}
          <LinearGradient
            colors={[
              "transparent",
              "transparent",
              "rgba(0,0,0,0.4)",
              "rgba(0,0,0,0.85)",
              "rgba(0,0,0,0.95)",
            ]}
            locations={[0, 0.4, 0.55, 0.7, 0.85]}
            style={styles.gradientOverlay}
          />

          {/* Top-left: Tier badge */}
          <View style={styles.topRow}>
            <View style={[styles.tierBadge, { backgroundColor: primary + "CC" }]}>
              <Text style={styles.tierText}>{result.tier}</Text>
            </View>
          </View>

          {/* Bottom content overlaid on gradient */}
          <View style={styles.bottomContent}>
            {/* Score */}
            <View style={styles.scoreRow}>
              <Text style={[styles.score, { textShadowColor: primary }]}>
                {result.aura_score}
              </Text>
              <Text style={styles.scoreLabel}>AURA</Text>
            </View>

            {/* Aura glow line */}
            <LinearGradient
              colors={[primary, secondary, primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.glowLine}
            />

            {/* Roast */}
            <Text style={styles.roast}>
              "{result.roast}"
            </Text>

            {/* Personality read */}
            <Text style={styles.personality}>
              {result.personality_read}
            </Text>

            {/* Watermark */}
            <Text style={styles.watermark}>aurate</Text>
          </View>
        </View>
      </ViewShot>

      {/* Action buttons — outside capture */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: primary + "20", borderColor: primary + "40" }]}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Text style={styles.actionEmoji}>{"📤"}</Text>
          <Text style={[styles.actionText, { color: primary }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.actionEmoji}>{"💾"}</Text>
          <Text style={styles.actionText}>Save</Text>
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
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    position: "relative",
  },

  // Photo fills entire card
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },

  // Gradient overlay for text readability
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Top row
  topRow: {
    position: "absolute",
    top: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: "row",
    justifyContent: "flex-start",
    zIndex: 2,
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

  // Bottom content
  bottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    zIndex: 2,
  },

  // Score
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  score: {
    fontSize: 64,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 4,
  },

  // Glow line separator
  glowLine: {
    height: 2,
    borderRadius: 1,
    marginBottom: SPACING.sm,
    opacity: 0.8,
  },

  // Roast
  roast: {
    fontSize: 16,
    fontWeight: "700",
    fontStyle: "italic",
    color: "#fff",
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },

  // Personality
  personality: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },

  // Watermark
  watermark: {
    fontSize: 11,
    fontWeight: "300",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 3,
    textAlign: "right",
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionEmoji: {
    fontSize: 16,
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
});
