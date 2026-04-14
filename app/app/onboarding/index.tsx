import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { COLORS, SPACING } from "../../src/constants/theme";
import { SIGMA_PATHS } from "../../src/constants/paths";
import { useAuthStore } from "../../src/store/authStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/* ------------------------------------------------------------------ */
/*  Screen 1 – Welcome                                                */
/* ------------------------------------------------------------------ */
function WelcomeScreen() {
  return (
    <View style={[styles.page, styles.center]}>
      <Text style={styles.bigEmoji}>{"🌀"}</Text>
      <Text style={styles.title}>Welcome to Aurate</Text>
      <Text style={styles.body}>
        The AI rates your aura.{"\n"}Are you HIM or are you mid?
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen 2 – Pick your Sigma Path                                   */
/* ------------------------------------------------------------------ */
function PathPickerScreen({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.page}>
      <Text style={[styles.title, { marginTop: SPACING.xxl }]}>
        Pick your Sigma Path
      </Text>
      <Text style={[styles.body, { marginBottom: SPACING.lg }]}>
        Choose the path that matches your grindset
      </Text>
      {SIGMA_PATHS.map((p) => {
        const active = selected === p.id;
        return (
          <TouchableOpacity
            key={p.id}
            style={[styles.pathCard, active && styles.pathCardActive]}
            onPress={() => onSelect(p.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.pathEmoji}>{p.emoji}</Text>
            <View style={styles.pathInfo}>
              <Text style={styles.pathLabel}>{p.label}</Text>
              <Text style={styles.pathDesc} numberOfLines={1}>
                {p.description}
              </Text>
            </View>
            {active && <Text style={styles.checkMark}>{"✓"}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen 3 – Let's Go                                               */
/* ------------------------------------------------------------------ */
function LaunchScreen() {
  return (
    <View style={[styles.page, styles.center]}>
      <Text style={styles.bigEmoji}>{"◉"}</Text>
      <Text style={styles.title}>Drop your first pic</Text>
      <Text style={styles.body}>Your aura origin story starts now.</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Onboarding component                                         */
/* ------------------------------------------------------------------ */
export default function OnboardingScreen() {
  const router = useRouter();
  const setPath = useAuthStore((s) => s.setPath);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const progress = useSharedValue(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        setCurrentIndex(idx);
        progress.value = withTiming(idx, { duration: 300 });
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goNext = () => {
    if (currentIndex < 2) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleFinish = async () => {
    if (selectedPath) {
      setPath(selectedPath);
    }
    await completeOnboarding();
    // Route guard in _layout.tsx will auto-navigate to (tabs) reactively
  };

  const isNextDisabled = currentIndex === 1 && !selectedPath;
  const isLastScreen = currentIndex === 2;

  const screens = [
    { key: "welcome" },
    { key: "paths" },
    { key: "launch" },
  ];

  /* Dot indicator animated styles */
  const dot0Style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1, 2], [1, 0.3, 0.3], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1, 2], [1.3, 1, 1], Extrapolation.CLAMP) }],
  }));
  const dot1Style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1, 2], [0.3, 1, 0.3], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1, 2], [1, 1.3, 1], Extrapolation.CLAMP) }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1, 2], [0.3, 0.3, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1, 2], [1, 1, 1.3], Extrapolation.CLAMP) }],
  }));
  const dotStyles = [dot0Style, dot1Style, dot2Style];

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={screens}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ index }) => {
          if (index === 0) return <WelcomeScreen />;
          if (index === 1)
            return (
              <PathPickerScreen
                selected={selectedPath}
                onSelect={setSelectedPath}
              />
            );
          return <LaunchScreen />;
        }}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {dotStyles.map((ds, i) => (
          <Animated.View key={i} style={[styles.dot, ds]} />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            isNextDisabled && styles.ctaDisabled,
          ]}
          disabled={isNextDisabled}
          onPress={isLastScreen ? handleFinish : goNext}
          activeOpacity={0.8}
        >
          <Text style={styles.ctaText}>
            {isLastScreen ? "Let's Go" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  page: { width: SCREEN_WIDTH, paddingHorizontal: SPACING.lg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  bigEmoji: { fontSize: 72, marginBottom: SPACING.lg },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  body: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },

  /* Path cards */
  pathCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pathCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.bgElevated },
  pathEmoji: { fontSize: 24, marginRight: SPACING.md },
  pathInfo: { flex: 1 },
  pathLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "700" },
  pathDesc: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  checkMark: { color: COLORS.primary, fontSize: 20, fontWeight: "700" },

  /* Dots */
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginHorizontal: 4,
  },

  /* CTA */
  ctaWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  ctaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700" },
});
