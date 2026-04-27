import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Line, Path, Rect } from "react-native-svg";
import { COLORS, FONTS, SPACING } from "../constants/theme";

// "Dossier under review" loading screen.
// Full press-room aesthetic: tilted polaroid card with the user's photo
// (or a silhouette placeholder), being scanned by a hazard line, with a
// console of cycling verdict copy, 5 staggered metric bars filling, a
// live ticker of measurement deltas scrolling, and a hazard-stripe
// progress bar. Spec: docs/design/system/project/preview/components-loading.html

const VERDICTS: Array<{ before: string; em: string; after: string }> = [
  { before: "analyzing your ", em: "aura",    after: " fr fr" },
  { before: "computing the ", em: "mog",      after: " differential" },
  { before: "checking if you're ", em: "HIM", after: "" },
  { before: "the AI is ",   em: "cooking",     after: " rn" },
];

const STATS: Array<{ label: string; target: number; color: string; delay: number }> = [
  { label: "DRIP",        target: 0.84, color: COLORS.ink,    delay: 0 },
  { label: "JAWLINE",     target: 0.71, color: COLORS.ink,    delay: 250 },
  { label: "SIGMA INDEX", target: 0.92, color: COLORS.hazard, delay: 500 },
  { label: "VIBE",        target: 0.58, color: COLORS.ink,    delay: 750 },
  { label: "RIZZ",        target: 0.96, color: COLORS.hazard, delay: 1000 },
];

const TICKER_ITEMS: Array<{ symbol: string; text: string; tone: "up" | "down" | "alert" }> = [
  { symbol: "▲", text: "JAWLINE +7",     tone: "up" },
  { symbol: "▲", text: "DRIP +12",       tone: "up" },
  { symbol: "▼", text: "NPC ENERGY −3",  tone: "down" },
  { symbol: "▲", text: "RIZZ +18",       tone: "up" },
  { symbol: "▲", text: "SIGMA INDEX +9", tone: "up" },
  { symbol: "!", text: "COOKING DETECTED", tone: "alert" },
  { symbol: "▲", text: "AURA +24",       tone: "up" },
];

const SCREEN_W = Dimensions.get("window").width;

interface DossierLoadingScreenProps {
  imageUri?: string | null;
  sigmaPath?: string;
}

export default function DossierLoadingScreen({
  imageUri,
  sigmaPath,
}: DossierLoadingScreenProps) {
  // Verdict cycle — slam-cuts between 4 verdicts every 2s
  const [verdictIdx, setVerdictIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setVerdictIdx((i) => (i + 1) % VERDICTS.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Photo scan line — sweeps top→bottom→top every 1.4s
  const scanY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanY, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanY]);

  // Dossier card tilt — breathes -2.2° to -1.4° every 4.6s
  const tiltDeg = useRef(new Animated.Value(-2.2)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(tiltDeg, {
          toValue: -1.4,
          duration: 2300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(tiltDeg, {
          toValue: -2.2,
          duration: 2300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [tiltDeg]);

  // PENDING stamp — slams in every 3.6s
  const stampOpacity = useRef(new Animated.Value(0)).current;
  const stampScale = useRef(new Animated.Value(1.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2160),
        Animated.parallel([
          Animated.timing(stampOpacity, {
            toValue: 1,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(stampScale, {
            toValue: 1,
            duration: 60,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(1280),
        Animated.timing(stampOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(stampScale, {
          toValue: 1.4,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [stampOpacity, stampScale]);

  // Bar fills — staggered, per STATS.delay
  const barWidths = useRef(STATS.map(() => new Animated.Value(0.06))).current;
  useEffect(() => {
    const animations = STATS.map((stat, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(stat.delay),
          Animated.timing(barWidths[i], {
            toValue: stat.target,
            duration: 2000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.delay(400),
          Animated.timing(barWidths[i], {
            toValue: 0.06,
            duration: 600,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [barWidths]);

  // Live ticker — translates -50% → 0 in a loop
  const tickerX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(tickerX, {
        toValue: -1,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [tickerX]);

  // Progress fill 6% → 96% over 4.6s loop
  const progressWidth = useRef(new Animated.Value(0.04)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressWidth, {
          toValue: 0.88,
          duration: 3000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progressWidth, {
          toValue: 0.96,
          duration: 1100,
          useNativeDriver: false,
        }),
        Animated.delay(500),
        Animated.timing(progressWidth, {
          toValue: 0.04,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progressWidth]);

  // Time stamp + case number
  const timeStamp = `${new Date().toLocaleString("en-GB", { month: "2-digit", day: "2-digit" }).replace(/\//, ".")} · ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  const caseNumber = `#${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`;
  const lensUpper = (sigmaPath ?? "sigma").replace(/_/g, " ").toUpperCase();

  const verdict = VERDICTS[verdictIdx];

  return (
    <View style={styles.stage}>
      {/* Stage crop marks */}
      <View style={[styles.crop, styles.cropTL]} />
      <View style={[styles.crop, styles.cropTR]} />
      <View style={[styles.crop, styles.cropBL]} />
      <View style={[styles.crop, styles.cropBR]} />

      {/* Top status */}
      <View style={styles.statusRow}>
        <Text style={styles.statusText}>● UNDER REVIEW</Text>
        <Text style={styles.statusText}>
          {caseNumber} · LENS · {lensUpper}
        </Text>
      </View>

      {/* Center: dossier + console */}
      <View style={styles.center}>
        {/* LEFT — dossier card */}
        <Animated.View
          style={[
            styles.dossier,
            {
              transform: [
                {
                  rotate: tiltDeg.interpolate({
                    inputRange: [-2.2, -1.4],
                    outputRange: ["-2.2deg", "-1.4deg"],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Card head */}
          <View style={styles.dossierHead}>
            <Text style={styles.dossierTitle}>DOSSIER</Text>
            <Text style={styles.dossierMeta}>
              {new Date()
                .toLocaleDateString("en-GB", {
                  month: "2-digit",
                  day: "2-digit",
                  year: "2-digit",
                })
                .replace(/\//g, ".")}
            </Text>
          </View>

          {/* Photo */}
          <View style={styles.photo}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photoImage} resizeMode="cover" />
            ) : (
              <Svg
                viewBox="0 0 100 125"
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid slice"
              >
                <Rect width={100} height={125} fill={COLORS.hazard} />
                <Path
                  d="M 50 28 q -16 0 -16 18 q 0 9 5 14 q -16 6 -22 18 q -3 6 -3 14 v 33 h 72 v -33 q 0 -8 -3 -14 q -6 -12 -22 -18 q 5 -5 5 -14 q 0 -18 -16 -18 z"
                  fill={COLORS.ink}
                />
                <Line x1={0} y1={62} x2={100} y2={62} stroke={COLORS.ink} strokeWidth={0.4} strokeDasharray="1.5 2" />
                <Line x1={50} y1={0} x2={50} y2={125} stroke={COLORS.ink} strokeWidth={0.4} strokeDasharray="1.5 2" />
              </Svg>
            )}

            {/* Photo crop marks */}
            <View style={[styles.photoCrop, styles.photoCropTL]} />
            <View style={[styles.photoCrop, styles.photoCropTR]} />
            <View style={[styles.photoCrop, styles.photoCropBL]} />
            <View style={[styles.photoCrop, styles.photoCropBR]} />

            {/* Scan line */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanY.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-3, 152],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>

          {/* Dossier rows */}
          <View style={styles.dossierRows}>
            {[
              ["SUBJ", "@YOU"],
              ["LENS", lensUpper],
              ["SCAN", "04 / 04"],
              ["JURY", "GEMINI 2.5"],
              ["VERDICT", "PENDING"],
            ].map(([k, v], idx) => (
              <View key={k} style={styles.dossierRow}>
                <Text style={styles.dossierRowLabel}>{k}</Text>
                <Text
                  style={[
                    styles.dossierRowValue,
                    idx === 4 && { color: COLORS.blood },
                  ]}
                >
                  {v}
                </Text>
              </View>
            ))}
          </View>

          {/* PENDING stamp — slams in periodically */}
          <Animated.View
            style={[
              styles.stamp,
              {
                opacity: stampOpacity,
                transform: [
                  { rotate: "-14deg" },
                  { scale: stampScale },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.stampText}>PENDING</Text>
          </Animated.View>
        </Animated.View>

        {/* RIGHT — console */}
        <View style={styles.console}>
          {/* Cycling verdict */}
          <View style={styles.verdictWrap}>
            <Text style={styles.verdictText}>
              {verdict.before}
              <Text style={styles.verdictEm}>{verdict.em}</Text>
              {verdict.after}
            </Text>
          </View>

          {/* Bars */}
          <View style={styles.bars}>
            {STATS.map((stat, i) => (
              <View key={stat.label} style={styles.barRow}>
                <Text style={styles.barLabel}>{stat.label}</Text>
                <View style={styles.barTrack}>
                  <Animated.View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: stat.color === COLORS.hazard ? COLORS.hazard : COLORS.hazard,
                        width: barWidths[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>
                  {Math.round(stat.target * 100)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Live ticker */}
      <View style={styles.ticker}>
        <View style={styles.tickerLive}>
          <Text style={styles.tickerLiveText}>▌LIVE</Text>
        </View>
        <View style={styles.tickerTrackWrap}>
          <Animated.View
            style={[
              styles.tickerTrack,
              {
                transform: [
                  {
                    translateX: tickerX.interpolate({
                      inputRange: [-1, 0],
                      outputRange: [-SCREEN_W * 1.5, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <View key={i} style={styles.tickerItem}>
                <Text
                  style={[
                    styles.tickerSymbol,
                    item.tone === "down" && { color: COLORS.blood },
                    item.tone === "alert" && { color: COLORS.blood },
                  ]}
                >
                  {item.symbol}
                </Text>
                <Text style={styles.tickerText}>{item.text}</Text>
                <Text style={styles.tickerSep}>·</Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        <View style={styles.progressLabel}>
          <Text style={styles.progressLabelText}>PASS 03 / 04 · ROAST GENERATION</Text>
          <Text style={styles.progressLabelAccent}>EST. 2S</Text>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Bottom readout */}
      <View style={styles.readout}>
        <Text style={styles.readoutText}>VIBE.CHK</Text>
        <Text style={[styles.readoutText, { color: COLORS.hazard }]}>
          ● JURY DELIBERATING
        </Text>
        <Text style={styles.readoutText}>{timeStamp}</Text>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: COLORS.ink,
    position: "relative",
    overflow: "hidden",
  },

  crop: {
    position: "absolute",
    width: 14,
    height: 14,
    borderColor: COLORS.hazard,
    zIndex: 7,
  },
  cropTL: { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2 },
  cropTR: { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2 },
  cropBL: { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2 },
  cropBR: { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2 },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 10,
  },
  statusText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    letterSpacing: 2.4,
    color: COLORS.hazard,
  },

  center: {
    flexDirection: "row",
    paddingHorizontal: 22,
    paddingTop: 14,
    gap: 16,
  },

  // ─── Dossier card (LEFT) ─────────────────────────
  dossier: {
    width: 158,
    backgroundColor: COLORS.paper,
    padding: 10,
    paddingBottom: 12,
    // Hazard "shadow" via offset border — RN can't do double-stack box-shadow
    // cleanly so we approximate with a wrapper trick: drop the outer shadow.
  },
  dossierHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.ink,
    paddingBottom: 5,
    marginBottom: 6,
  },
  dossierTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  dossierMeta: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    letterSpacing: 1.8,
    color: COLORS.ink,
  },

  photo: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderWidth: 1,
    borderColor: COLORS.ink,
    overflow: "hidden",
    marginBottom: 6,
    backgroundColor: COLORS.hazard,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoCrop: {
    position: "absolute",
    width: 9,
    height: 9,
    borderColor: COLORS.ink,
    zIndex: 3,
  },
  photoCropTL: { top: 4, left: 4, borderTopWidth: 2, borderLeftWidth: 2 },
  photoCropTR: { top: 4, right: 4, borderTopWidth: 2, borderRightWidth: 2 },
  photoCropBL: { bottom: 4, left: 4, borderBottomWidth: 2, borderLeftWidth: 2 },
  photoCropBR: { bottom: 4, right: 4, borderBottomWidth: 2, borderRightWidth: 2 },
  scanLine: {
    position: "absolute",
    left: -2,
    right: -2,
    height: 3,
    backgroundColor: COLORS.ink,
    shadowColor: COLORS.hazard,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 2,
  },

  dossierRows: {
    paddingTop: 2,
  },
  dossierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10,10,10,0.18)",
    borderStyle: "dashed",
  },
  dossierRowLabel: {
    fontFamily: FONTS.mono,
    fontSize: 8,
    letterSpacing: 1.4,
    color: COLORS.ink,
  },
  dossierRowValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    letterSpacing: 1.4,
    color: COLORS.ink,
  },

  stamp: {
    position: "absolute",
    top: "30%",
    right: -14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: COLORS.blood,
    backgroundColor: "rgba(245,241,230,0.4)",
    zIndex: 5,
  },
  stampText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.blood,
    letterSpacing: 0.6,
  },

  // ─── Console (RIGHT) ─────────────────────────────
  console: {
    flex: 1,
    paddingTop: 4,
  },

  verdictWrap: {
    minHeight: 96,
    marginBottom: 10,
  },
  verdictText: {
    fontFamily: FONTS.display,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -1,
    color: COLORS.paper,
  },
  verdictEm: {
    color: COLORS.hazard,
  },

  bars: {
    gap: 6,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    color: COLORS.ghost,
    letterSpacing: 1.4,
    width: 70,
  },
  barTrack: {
    flex: 1,
    height: 9,
    backgroundColor: COLORS.ink2,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: COLORS.hazard,
  },
  barValue: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    color: COLORS.hazard,
    letterSpacing: 1.4,
    width: 24,
    textAlign: "right",
  },

  // ─── Ticker ──────────────────────────────────────
  ticker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.paper,
    marginHorizontal: 22,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.ink,
    paddingVertical: 7,
    paddingRight: 10,
    overflow: "hidden",
  },
  tickerLive: {
    backgroundColor: COLORS.hazard,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tickerLiveText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.ink,
    letterSpacing: 2.2,
  },
  tickerTrackWrap: {
    flex: 1,
    overflow: "hidden",
  },
  tickerTrack: {
    flexDirection: "row",
    gap: 16,
  },
  tickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tickerSymbol: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.ink,
  },
  tickerText: {
    fontFamily: FONTS.monoBold,
    fontSize: 10,
    color: COLORS.ink,
    letterSpacing: 1.5,
  },
  tickerSep: {
    color: COLORS.ghost,
    marginHorizontal: 4,
  },

  // ─── Progress ────────────────────────────────────
  progress: {
    marginHorizontal: 22,
    marginTop: 14,
  },
  progressLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  progressLabelText: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    letterSpacing: 2.2,
    color: COLORS.ghost,
  },
  progressLabelAccent: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    letterSpacing: 2.2,
    color: COLORS.hazard,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.ink2,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.hazard,
  },

  // ─── Readout ─────────────────────────────────────
  readout: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
  },
  readoutText: {
    fontFamily: FONTS.monoBold,
    fontSize: 8,
    letterSpacing: 2.2,
    color: COLORS.ghost,
  },
});
