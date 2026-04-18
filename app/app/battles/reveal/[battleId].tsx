import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS, SPACING, FONTS } from "../../../src/constants/theme";

// Lazy haptics: only call if package is installed and working at runtime
let Haptics: any = null;
let hapticsAvailable = false;
try {
  Haptics = require("expo-haptics");
  // Test if the module actually works (won't on dev client without native link)
  hapticsAvailable = typeof Haptics?.impactAsync === "function";
} catch {}
const haptic = {
  heavy: () => { if (hapticsAvailable) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { hapticsAvailable = false; }); },
  medium: () => { if (hapticsAvailable) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { hapticsAvailable = false; }); },
  selection: () => { if (hapticsAvailable) Haptics.selectionAsync().catch(() => { hapticsAvailable = false; }); },
  success: () => { if (hapticsAvailable) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { hapticsAvailable = false; }); },
};
import { authedFetch } from "../../../src/lib/api";
import { useAuthStore } from "../../../src/store/authStore";

const { width: SCREEN_W } = Dimensions.get("window");

interface AuraCheck {
  id: string;
  user_id: string;
  aura_score: number;
  personality_read: string;
  roast: string;
  tier: string;
  stats?: { label: string; score: number }[];
  image_url?: string;
}

interface Battle {
  id: string;
  challenger_id: string;
  opponent_id: string;
  winner_id: string | null;
  margin: "UD" | "SD" | "TKO" | "DRAW" | "FORFEIT" | null;
  sigma_path: string;
  narrative: { rounds: string[]; final_line: string } | null;
  status: string;
  completed_at: string | null;
  challenger?: { id: string; username: string } | null;
  opponent?: { id: string; username: string } | null;
  challenger_check?: AuraCheck | null;
  opponent_check?: AuraCheck | null;
}

type Phase = "loading" | "entrance" | "intro" | "rounds" | "verdict" | "scorecard";

function formatPath(p: string) {
  return p.replace(/_/g, " ").toUpperCase();
}

export default function RevealScreen() {
  const router = useRouter();
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const { profile } = useAuthStore();

  const [battle, setBattle] = useState<Battle | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [roundIdx, setRoundIdx] = useState(0);

  const entranceAnim = useRef(new Animated.Value(0)).current;
  const introAnim = useRef(new Animated.Value(0)).current;
  const roundAnim = useRef(new Animated.Value(0)).current;
  const verdictAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch(`/battles/${battleId}`);
        const json = await res.json();
        if (json?.battle?.status === "completed") {
          setBattle(json.battle);
          setPhase("entrance");
        } else {
          setBattle(json.battle);
          setPhase("loading");
        }
      } catch {
        setBattle(null);
      }
    })();
  }, [battleId]);

  // Phase: entrance (0.8s flash)
  useEffect(() => {
    if (phase !== "entrance") return;
    haptic.heavy();
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => setPhase("intro"), 900);
    return () => clearTimeout(t);
  }, [phase]);

  // Phase: fighter intro (2s)
  useEffect(() => {
    if (phase !== "intro") return;
    haptic.medium();
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => {
      setPhase("rounds");
      setRoundIdx(0);
    }, 2000);
    return () => clearTimeout(t);
  }, [phase]);

  // Phase: rounds (1.8s per round)
  useEffect(() => {
    if (phase !== "rounds" || !battle?.narrative?.rounds) return;
    roundAnim.setValue(0);
    haptic.selection();
    Animated.timing(roundAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const total = battle.narrative.rounds.length;
    const t = setTimeout(() => {
      if (roundIdx + 1 < total) {
        setRoundIdx(roundIdx + 1);
      } else {
        setPhase("verdict");
      }
    }, 2100);
    return () => clearTimeout(t);
  }, [phase, roundIdx, battle]);

  // Phase: verdict (2s dramatic)
  useEffect(() => {
    if (phase !== "verdict") return;
    haptic.success();
    Animated.timing(verdictAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => setPhase("scorecard"), 2400);
    return () => clearTimeout(t);
  }, [phase]);

  if (!battle) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>LOADING BATTLE...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (battle.status !== "completed") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.pendingLabel}>⚔ PENDING</Text>
          <Text style={styles.pendingText}>
            WAITING FOR OPPONENT{"\n"}TO ACCEPT
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
            <Text style={styles.exitText}>← BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const challenger = battle.challenger;
  const opponent = battle.opponent;
  const cCheck = battle.challenger_check;
  const oCheck = battle.opponent_check;
  const amIChallenger = profile?.id === battle.challenger_id;
  const me = amIChallenger ? cCheck : oCheck;
  const them = amIChallenger ? oCheck : cCheck;
  const myName = amIChallenger ? challenger?.username : opponent?.username;
  const theirName = amIChallenger ? opponent?.username : challenger?.username;

  const isDraw = battle.winner_id == null;
  const isWin = !isDraw && battle.winner_id === profile?.id;

  const verdictText = isDraw
    ? "DRAW"
    : isWin
    ? "VICTORY"
    : "DEFEAT";

  // ─── ENTRANCE ───
  if (phase === "entrance") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <Animated.View
          style={[
            styles.fullCenter,
            {
              opacity: entranceAnim,
              transform: [
                {
                  scale: entranceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.entranceEyebrow}>{formatPath(battle.sigma_path)}</Text>
          <Text style={styles.entranceTitle}>FIGHT.</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ─── INTRO ───
  if (phase === "intro") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <Animated.View
          style={[
            styles.fullCenter,
            {
              opacity: introAnim,
              transform: [
                {
                  translateY: introAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.fighterRow}>
            <View style={styles.fighterBlock}>
              <Text style={styles.fighterLabel}>CHALLENGER</Text>
              <Text style={styles.fighterName}>@{challenger?.username}</Text>
              <Text style={styles.fighterScore}>{cCheck?.aura_score ?? 0}</Text>
            </View>
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.fighterBlock}>
              <Text style={styles.fighterLabel}>OPPONENT</Text>
              <Text style={styles.fighterName}>@{opponent?.username}</Text>
              <Text style={styles.fighterScore}>{oCheck?.aura_score ?? 0}</Text>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ─── ROUNDS ───
  if (phase === "rounds") {
    const rounds = battle.narrative?.rounds ?? [];
    const current = rounds[roundIdx] ?? "";
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.roundHeader}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.roundLabel}>
            ROUND {String(roundIdx + 1).padStart(2, "0")} / {String(rounds.length).padStart(2, "0")}
          </Text>
        </View>
        <Animated.View
          style={[
            styles.roundBody,
            {
              opacity: roundAnim,
              transform: [
                {
                  translateX: roundAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.roundText}>{current}</Text>
        </Animated.View>
        <View style={styles.dotsRow}>
          {rounds.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i <= roundIdx && styles.dotActive]}
            />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ─── VERDICT ───
  if (phase === "verdict") {
    const finalLine = battle.narrative?.final_line ?? "";
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <Animated.View
          style={[
            styles.fullCenter,
            {
              opacity: verdictAnim,
              transform: [
                {
                  scale: verdictAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.verdictLabel,
              { color: isWin ? COLORS.primary : isDraw ? COLORS.textMuted : COLORS.blood },
            ]}
          >
            {battle.margin ?? "DECISION"}
          </Text>
          <Text
            style={[
              styles.verdictText,
              { color: isWin ? COLORS.primary : isDraw ? COLORS.textPrimary : COLORS.blood },
            ]}
          >
            {verdictText}
          </Text>
          <Text style={styles.finalLine}>"{finalLine}"</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ─── SCORECARD ───
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scorecardScroll}>
        <View style={styles.scorecardHeader}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrow}>OFFICIAL SCORECARD</Text>
          </View>
          <Text
            style={[
              styles.verdictText,
              { color: isWin ? COLORS.primary : isDraw ? COLORS.textPrimary : COLORS.blood },
            ]}
          >
            {verdictText}
          </Text>
          <Text style={styles.pathMeta}>{formatPath(battle.sigma_path)} · {battle.margin}</Text>
        </View>

        {/* Fighters */}
        <View style={styles.sbRow}>
          <View style={styles.sbCol}>
            <Text style={styles.sbLabel}>YOU</Text>
            <Text style={styles.sbName}>@{myName}</Text>
            <Text
              style={[
                styles.sbScore,
                { color: isWin ? COLORS.primary : isDraw ? COLORS.textPrimary : COLORS.blood },
              ]}
            >
              {me?.aura_score ?? 0}
            </Text>
          </View>
          <Text style={styles.sbDivider}>·</Text>
          <View style={styles.sbCol}>
            <Text style={styles.sbLabel}>THEM</Text>
            <Text style={styles.sbName}>@{theirName}</Text>
            <Text style={styles.sbScore}>{them?.aura_score ?? 0}</Text>
          </View>
        </View>

        {/* Stats diff */}
        {me?.stats && them?.stats && (
          <View style={styles.statsBlock}>
            <Text style={styles.statsHeader}>STAT BREAKDOWN</Text>
            {me.stats.map((stat, i) => {
              const opp = them.stats?.find((s) => s.label === stat.label);
              const diff = (stat.score ?? 0) - (opp?.score ?? 0);
              const winStat = diff > 0;
              return (
                <View key={i} style={styles.statRow}>
                  <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
                  <Text style={styles.statMe}>{stat.score}</Text>
                  <Text
                    style={[
                      styles.statDiff,
                      { color: winStat ? COLORS.primary : diff < 0 ? COLORS.blood : COLORS.textMuted },
                    ]}
                  >
                    {diff > 0 ? `+${diff}` : diff}
                  </Text>
                  <Text style={styles.statThem}>{opp?.score ?? "-"}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Final narrative */}
        {battle.narrative?.final_line && (
          <View style={styles.finalBox}>
            <Text style={styles.finalBoxLabel}>FINAL WORD</Text>
            <Text style={styles.finalBoxText}>"{battle.narrative.final_line}"</Text>
          </View>
        )}

        {/* Rounds replay */}
        {battle.narrative?.rounds && (
          <View style={styles.roundsReplay}>
            <Text style={styles.statsHeader}>ROUND BY ROUND</Text>
            {battle.narrative.rounds.map((r, i) => (
              <View key={i} style={styles.replayRow}>
                <Text style={styles.replayNum}>R{i + 1}</Text>
                <Text style={styles.replayText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => router.replace("/(tabs)/battles" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.doneText}>DONE</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  fullCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  loadingText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: SPACING.md,
  },
  pendingLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.primary,
    letterSpacing: 3,
    marginBottom: SPACING.md,
  },
  pendingText: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: COLORS.textPrimary,
    textAlign: "center",
    lineHeight: 32,
    marginBottom: SPACING.xl,
  },
  exitBtn: { padding: SPACING.md },
  exitText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 2,
  },

  // Entrance
  entranceEyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.primary,
    letterSpacing: 4,
    marginBottom: SPACING.md,
  },
  entranceTitle: {
    fontFamily: FONTS.display,
    fontSize: 140,
    lineHeight: 128,
    color: COLORS.textPrimary,
    letterSpacing: -6,
  },

  // Intro
  fighterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  fighterBlock: {
    flex: 1,
    alignItems: "center",
  },
  fighterLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 6,
  },
  fighterName: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  fighterScore: {
    fontFamily: FONTS.display,
    fontSize: 72,
    lineHeight: 68,
    color: COLORS.primary,
    letterSpacing: -3,
    includeFontPadding: false,
  },
  vsText: {
    fontFamily: FONTS.display,
    fontSize: 48,
    color: COLORS.textMuted,
    letterSpacing: -2,
  },

  // Rounds
  roundHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  eyebrowLine: {
    width: 20,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
  },
  roundLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 2.5,
  },
  roundBody: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: "center",
  },
  roundText: {
    fontFamily: FONTS.display,
    fontSize: 32,
    lineHeight: 36,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingBottom: SPACING.xl,
  },
  dot: {
    width: 24,
    height: 3,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
  },

  // Verdict
  verdictLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    letterSpacing: 4,
    marginBottom: SPACING.sm,
  },
  verdictText: {
    fontFamily: FONTS.display,
    fontSize: 96,
    lineHeight: 88,
    letterSpacing: -4,
    marginBottom: SPACING.lg,
  },
  finalLine: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    textAlign: "center",
    paddingHorizontal: SPACING.lg,
    lineHeight: 20,
  },

  // Scorecard
  scorecardScroll: {
    paddingBottom: SPACING.xxl,
  },
  scorecardHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 214, 10, 0.12)",
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  eyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
  },
  pathMeta: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginTop: 4,
  },

  sbRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  sbCol: { flex: 1, alignItems: "center" },
  sbLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  sbName: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  sbScore: {
    fontFamily: FONTS.display,
    fontSize: 56,
    lineHeight: 52,
    letterSpacing: -2,
    color: COLORS.textPrimary,
    includeFontPadding: false,
  },
  sbDivider: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: COLORS.textMuted,
  },

  statsBlock: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    marginTop: SPACING.md,
  },
  statsHeader: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
    marginBottom: SPACING.sm,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 214, 10, 0.06)",
  },
  statLabel: {
    flex: 1.5,
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
  statMe: {
    width: 40,
    textAlign: "right",
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  statDiff: {
    width: 50,
    textAlign: "center",
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  statThem: {
    width: 40,
    textAlign: "left",
    fontFamily: FONTS.monoBold,
    fontSize: 12,
    color: COLORS.textMuted,
  },

  finalBox: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 214, 10, 0.06)",
  },
  finalBoxLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.primary,
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  finalBoxText: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    lineHeight: 24,
  },

  roundsReplay: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  replayRow: {
    flexDirection: "row",
    paddingVertical: 8,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 214, 10, 0.06)",
  },
  replayNum: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.primary,
    letterSpacing: 1.5,
    width: 24,
  },
  replayText: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },

  doneBtn: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    alignItems: "center",
  },
  doneText: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: COLORS.bg,
    letterSpacing: -1,
  },
});
