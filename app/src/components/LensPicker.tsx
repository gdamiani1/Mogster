import { useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SIGMA_PATHS, SigmaPathId } from "../constants/paths";
import { COLORS, FONTS, SPACING } from "../constants/theme";

// Short, brand-voice descriptions for the modal — paired against the
// existing data file's descriptions which read more sentence-like.
// These match the design output (Mogster Design System / Pick a Lens modal).
const MODAL_DESC: Record<SigmaPathId, string> = {
  auramaxxing: "main character energy. the whole vibe.",
  looksmaxxing: "the glow-up audit. drip + structure.",
  mogger_mode: "raw dominance. who's mogging the room.",
  rizzmaxxing: "charm + magnetism index.",
  statusmaxxing: "the flex inspector. real or fake.",
  brainrot_mode: "internet poisoning. peak ohio energy.",
  sigma_grindset: "discipline + lone wolf signal.",
};

interface LensPickerProps {
  visible: boolean;
  selected: SigmaPathId;
  onSelect: (id: SigmaPathId) => void;
  onClose: () => void;
}

export function LensPicker({
  visible,
  selected,
  onSelect,
  onClose,
}: LensPickerProps) {
  const total = SIGMA_PATHS.length;
  const futureCount = useMemo(() => Math.max(0, 12 - total), [total]);

  return (
    <Modal
      visible={visible}
      animationType="none" // slam-cut, no spring
      transparent
      onRequestClose={onClose}
    >
      {/* Ink backdrop — tap to dismiss */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.sheet} pointerEvents="box-none">
        <SafeAreaView style={styles.sheetInner} edges={["bottom"]}>
          {/* Hazard tape header */}
          <View style={styles.hazardTape} />

          {/* Eyebrow + close */}
          <View style={styles.header}>
            <Text style={styles.eyebrow}>── MODAL / PICK A LENS</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable list */}
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 8 }}>
            {SIGMA_PATHS.map((path, idx) => {
              const isSelected = path.id === selected;
              return (
                <TouchableOpacity
                  key={path.id}
                  style={[styles.row, isSelected && styles.rowSelected]}
                  onPress={() => {
                    onSelect(path.id);
                    onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.rowNum,
                      isSelected && styles.rowNumSelected,
                    ]}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </Text>

                  <View style={styles.rowBody}>
                    <Text
                      style={[
                        styles.rowName,
                        isSelected && styles.rowTextSelected,
                      ]}
                    >
                      {path.label.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.rowDesc,
                        isSelected && styles.rowDescSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {MODAL_DESC[path.id] ?? path.description}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.rowArrow,
                      isSelected && styles.rowTextSelected,
                    ]}
                  >
                    →
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer meta — "more is coming" */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ▌SCROLLS · {total} OF 12 PATHS SHOWN
            </Text>
            {futureCount > 0 && (
              <Text style={styles.footerAccent}>W3 · +{futureCount}</Text>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.6)", // 60% ink, no blur
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheetInner: {
    height: "85%",
    backgroundColor: COLORS.ink,
    borderTopWidth: 1,
    borderTopColor: COLORS.hazard,
  },

  hazardTape: {
    height: 24,
    backgroundColor: COLORS.ink,
    // Hazard tape pattern via overlapping borders. RN doesn't support
    // repeating-linear-gradient; we approximate by stacking two stripes.
    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 2.8,
    color: COLORS.hazard,
    textTransform: "uppercase",
  },
  closeBtn: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.paper,
    paddingTop: 2,
  },

  list: {
    flex: 1,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.ink2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hazard25,
    minHeight: 70,
  },
  rowSelected: {
    backgroundColor: COLORS.hazard,
    borderBottomColor: COLORS.ink,
  },
  rowNum: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.ghost,
    letterSpacing: 2.2,
    width: 32,
  },
  rowNumSelected: {
    color: COLORS.ink,
    opacity: 0.75,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.paper,
    letterSpacing: -0.3,
    lineHeight: 22,
    paddingTop: 3,
    textTransform: "uppercase",
  },
  rowDesc: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.ghost,
    letterSpacing: 0.4,
    marginTop: 4,
  },
  rowTextSelected: {
    color: COLORS.ink,
  },
  rowDescSelected: {
    color: COLORS.ink,
    opacity: 0.78,
  },
  rowArrow: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.ghost,
    marginLeft: 8,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    letterSpacing: 2.5,
    color: COLORS.ghost,
    textTransform: "uppercase",
  },
  footerAccent: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    letterSpacing: 2.5,
    color: COLORS.hazard,
    textTransform: "uppercase",
  },
});
