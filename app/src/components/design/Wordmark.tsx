import React from "react";
import { View, Text, StyleSheet, StyleProp, TextStyle } from "react-native";
import { COLORS, FONTS } from "../../constants/theme";

interface Props {
  size?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * MOGSTER. wordmark — condensed Anton with a hazard-yellow period.
 * Replaces the 🌀 emoji as the brand mark.
 */
export default function Wordmark({ size = 42, style }: Props) {
  return (
    <View style={styles.row}>
      <Text
        style={[
          {
            fontFamily: FONTS.display,
            fontSize: size,
            lineHeight: size * 0.85,
            color: COLORS.textPrimary,
            letterSpacing: -size * 0.02,
          },
          style,
        ]}
      >
        MOGSTER
      </Text>
      <Text
        style={{
          fontFamily: FONTS.display,
          fontSize: size,
          lineHeight: size * 0.85,
          color: COLORS.primary,
          letterSpacing: -size * 0.02,
        }}
      >
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline" },
});
