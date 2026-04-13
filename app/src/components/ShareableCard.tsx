import React, { forwardRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface ShareableCardProps {
  aura_score: number;
  tier: string;
  roast: string;
  aura_color: { primary: string; secondary: string };
}

const ShareableCard = forwardRef<View, ShareableCardProps>(
  ({ aura_score, tier, roast, aura_color }, ref) => {
    return (
      <View ref={ref} collapsable={false} style={styles.outerContainer}>
        <LinearGradient
          colors={[aura_color.primary, aura_color.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.card}
        >
          <View style={styles.topSection}>
            <Text style={styles.label}>YOUR AURA</Text>
            <Text style={styles.score}>{aura_score}</Text>
          </View>

          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{tier}</Text>
          </View>

          <View style={styles.roastBox}>
            <Text style={styles.quoteOpen}>{"\u201C"}</Text>
            <Text style={styles.roastText}>{roast}</Text>
            <Text style={styles.quoteClose}>{"\u201D"}</Text>
          </View>

          <View style={styles.watermark}>
            <Text style={styles.watermarkText}>aurate</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }
);

ShareableCard.displayName = "ShareableCard";
export default ShareableCard;

const CARD_WIDTH = 1080 / 3; // 360pt, renders at 1080px @3x
const CARD_HEIGHT = 1920 / 3; // 640pt, renders at 1920px @3x

const styles = StyleSheet.create({
  outerContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 0,
    overflow: "hidden",
  },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  topSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 6,
    marginBottom: 4,
  },
  score: {
    fontSize: 96,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  tierBadge: {
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 24,
    marginBottom: 32,
  },
  tierText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  roastBox: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: "100%",
    marginBottom: 32,
  },
  quoteOpen: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 36,
  },
  roastText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontStyle: "italic",
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  quoteClose: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 36,
    textAlign: "right",
  },
  watermark: {
    position: "absolute",
    bottom: 32,
  },
  watermarkText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 8,
    textTransform: "lowercase",
  },
});
