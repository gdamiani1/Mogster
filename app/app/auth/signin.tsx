import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { useAuthStore } from "../../src/store/authStore";
import { COLORS, SPACING, FONTS } from "../../src/constants/theme";
import Wordmark from "../../src/components/design/Wordmark";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Bro you left fields empty. That's not very sigma.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Invalid login")) {
        setError("Wrong credentials fam. You're cooked.");
      } else {
        setError("Something went wrong. Not very based of us.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: SPACING.xl }}>
          <Wordmark size={56} />
        </View>
        <Text style={styles.header}>WELCOME BACK.{"\n"}YOUR AURA AWAITS.</Text>
        <Text style={styles.sub}>SIGN IN · CONTINUE THE GRIND</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="sigma@mogster.app"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="your secret sauce"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textPrimary} />
          ) : (
            <Text style={styles.buttonText}>Check In</Text>
          )}
        </TouchableOpacity>

        <Link href="/auth/signup" asChild>
          <TouchableOpacity style={styles.linkWrap}>
            <Text style={styles.linkText}>
              New here?{" "}
              <Text style={styles.linkAccent}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  emoji: { fontSize: 48, textAlign: "center", marginBottom: SPACING.md },
  header: {
    fontFamily: FONTS.display,
    fontSize: 40,
    lineHeight: 36,
    color: COLORS.textPrimary,
    textAlign: "left",
    letterSpacing: -1,
    marginBottom: SPACING.sm,
  },
  sub: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: "left",
    letterSpacing: 2,
    marginBottom: SPACING.xl,
  },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.danger, fontSize: 14, textAlign: "center" },
  field: { marginBottom: SPACING.md },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  linkWrap: { marginTop: SPACING.lg, alignItems: "center" },
  linkText: { color: COLORS.textSecondary, fontSize: 14 },
  linkAccent: { color: COLORS.primary, fontWeight: "600" },
});
