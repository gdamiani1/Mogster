import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Svg, { Rect, Defs, Filter, FeTurbulence } from "react-native-svg";

/**
 * Grain/noise overlay. Place absolutely over any dark surface to add texture.
 * Uses a pointerEvents="none" wrapper so it never blocks touches.
 */
interface Props {
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

export default function GrainOverlay({ opacity = 0.08, style }: Props) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" style={{ opacity }}>
        <Defs>
          <Filter id="grain">
            <FeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} />
          </Filter>
        </Defs>
        <Rect width="100%" height="100%" filter="url(#grain)" />
      </Svg>
    </View>
  );
}
