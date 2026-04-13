import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Image,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { COLORS, SPACING } from "../constants/theme";

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
      await Share.share({
        message: `I just got ${result.aura_score} aura (${result.tier}) on Aurate.\n\n"${result.roast}"\n\nGet your aura checked fr fr`,
      });
    } catch (_) {
      // user cancelled
    }
  };

  const handleSave = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to save to camera roll");
        return;
      }
      if (!viewShotRef.current?.capture) {
        Alert.alert("Error", "Could not capture the card");
        return;
      }
      const uri = await viewShotRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Saved", "Your aura card has been saved to camera roll");
    } catch (err) {
      Alert.alert("Error", "Failed to save image");
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
        <View style={styles.card}>
          {/* Photo with glowing gradient border */}
          {imageUri && (
            <View style={styles.photoSection}>
              <View
                style={[
                  styles.photoGlowOuter,
                  {
                    shadowColor: primary,
                  },
                ]}
              >
                <LinearGradient
                  colors={[primary, secondary, primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.photoGradientBorder}
                >
                  <View style={styles.photoInner}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.photo}
                    />
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}

          {/* Score */}
          <Text style={styles.score}>{result.aura_score}</Text>
          <Text style={styles.scoreLabel}>AURA SCORE</Text>

          {/* Tier badge */}
          <View
            style={[
              styles.tierBadge,
              { backgroundColor: `${primary}30` },
            ]}
          >
            <Text style={[styles.tierText, { color: primary }]}>
              {result.tier}
            </Text>
          </View>

          {/* Roast quote card */}
          <View style={styles.roastCard}>
            <Text style={styles.roastQuoteMark}>{"\u201C"}</Text>
            <Text style={styles.roastText}>{result.roast}</Text>
            <Text style={styles.roastQuoteMarkEnd}>{"\u201D"}</Text>
          </View>

          {/* Personality read */}
          <Text style={styles.personalityRead}>{result.personality_read}</Text>

          {/* Watermark */}
          <Text style={styles.watermark}>aurate</Text>
        </View>
      </ViewShot>

      {/* Action buttons - outside capture area */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnIcon}>{"^"}</Text>
          <Text style={styles.actionBtnText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnIcon}>{"\u2193"}</Text>
          <Text style={styles.actionBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const PHOTO_SIZE = 200;
const BORDER_WIDTH = 4;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  captureArea: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ─── Photo ───
  photoSection: {
    marginBottom: SPACING.lg,
  },
  photoGlowOuter: {
    borderRadius: (PHOTO_SIZE + BORDER_WIDTH * 2) / 2 + 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 28,
    elevation: 16,
  },
  photoGradientBorder: {
    padding: BORDER_WIDTH,
    borderRadius: (PHOTO_SIZE + BORDER_WIDTH * 2) / 2,
  },
  photoInner: {
    borderRadius: PHOTO_SIZE / 2,
    overflow: "hidden",
    backgroundColor: COLORS.bg,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
  },

  // ─── Score ───
  score: {
    fontSize: 72,
    fontWeight: "900",
    color: COLORS.textPrimary,
    letterSpacing: -3,
    lineHeight: 78,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    letterSpacing: 4,
    marginTop: 2,
    marginBottom: SPACING.md,
  },

  // ─── Tier ───
  tierBadge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    marginBottom: SPACING.lg,
  },
  tierText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ─── Roast ───
  roastCard: {
    backgroundColor: COLORS.bgElevated,
    borderRadius: 16,
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roastQuoteMark: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 30,
    marginBottom: -4,
  },
  roastText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontStyle: "italic",
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  roastQuoteMarkEnd: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 30,
    textAlign: "right",
    marginTop: -2,
  },

  // ─── Personality ───
  personalityRead: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
    fontWeight: "400",
  },

  // ─── Watermark ───
  watermark: {
    fontSize: 12,
    fontWeight: "300",
    color: COLORS.textMuted,
    letterSpacing: 3,
    textTransform: "lowercase",
    opacity: 0.5,
  },

  // ─── Actions ───
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
  actionBtnIcon: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  actionBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
});
