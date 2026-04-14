import React from "react";
import { View, StyleSheet } from "react-native";
import { COLORS } from "../../constants/theme";

/**
 * Editorial crop/registration marks. Renders 4 L-shaped corners
 * inside any container to give the "print proof" aesthetic.
 */
interface Props {
  color?: string;
  size?: number;
  inset?: number;
  opacity?: number;
}

export default function CropMarks({
  color = COLORS.primary,
  size = 18,
  inset = 12,
  opacity = 0.6,
}: Props) {
  const thickness = 1;
  const base = {
    position: "absolute" as const,
    width: size,
    height: size,
    opacity,
  };
  return (
    <>
      {/* Top-left */}
      <View pointerEvents="none" style={[base, { top: inset, left: inset }]}>
        <View style={{ position: "absolute", top: 0, left: 0, width: size, height: thickness, backgroundColor: color }} />
        <View style={{ position: "absolute", top: 0, left: 0, width: thickness, height: size, backgroundColor: color }} />
      </View>
      {/* Top-right */}
      <View pointerEvents="none" style={[base, { top: inset, right: inset }]}>
        <View style={{ position: "absolute", top: 0, right: 0, width: size, height: thickness, backgroundColor: color }} />
        <View style={{ position: "absolute", top: 0, right: 0, width: thickness, height: size, backgroundColor: color }} />
      </View>
      {/* Bottom-left */}
      <View pointerEvents="none" style={[base, { bottom: inset, left: inset }]}>
        <View style={{ position: "absolute", bottom: 0, left: 0, width: size, height: thickness, backgroundColor: color }} />
        <View style={{ position: "absolute", bottom: 0, left: 0, width: thickness, height: size, backgroundColor: color }} />
      </View>
      {/* Bottom-right */}
      <View pointerEvents="none" style={[base, { bottom: inset, right: inset }]}>
        <View style={{ position: "absolute", bottom: 0, right: 0, width: size, height: thickness, backgroundColor: color }} />
        <View style={{ position: "absolute", bottom: 0, right: 0, width: thickness, height: size, backgroundColor: color }} />
      </View>
    </>
  );
}
