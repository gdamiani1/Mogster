import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { COLORS, SPACING, FONTS } from "../constants/theme";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches any uncaught JS error during render so the app shows a fallback
 * screen instead of white-screening or crashing to springboard. Ships a
 * "Try Again" button that forces a re-mount.
 *
 * This is a safety net — real bugs should still be fixed, but this prevents
 * a single React tree crash from killing the whole app.
 */
export default class RootErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("RootErrorBoundary caught:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.eyebrow}>⚠ SOMETHING BROKE</Text>
          <Text style={styles.title}>NICE TRY, BRO.</Text>
          <Text style={styles.body}>
            THE APP HIT AN UNEXPECTED ERROR.{"\n"}
            TAP RETRY — IF IT KEEPS CRASHING, LET US KNOW.
          </Text>
          <View style={styles.errorBox}>
            <Text style={styles.errorLabel}>ERROR</Text>
            <Text style={styles.errorText}>{this.state.error.message}</Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={this.reset}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>RETRY</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  eyebrow: {
    fontFamily: FONTS.monoBold,
    fontSize: 11,
    color: COLORS.primary,
    letterSpacing: 3,
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 56,
    lineHeight: 64,
    paddingTop: 6,
    includeFontPadding: false,
    color: COLORS.textPrimary,
    letterSpacing: -2,
    marginBottom: SPACING.md,
  },
  body: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    lineHeight: 18,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: SPACING.xl,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: COLORS.blood,
    backgroundColor: "rgba(255, 59, 48, 0.08)",
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  errorLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: 9,
    color: COLORS.blood,
    letterSpacing: 2,
    marginBottom: 6,
  },
  errorText: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.textPrimary,
    lineHeight: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: FONTS.monoBold,
    fontSize: 13,
    color: COLORS.bg,
    letterSpacing: 2.5,
  },
});
