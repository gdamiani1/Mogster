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

const BRAINROT_ERRORS: Record<string, string> = {
  "User already registered": "Bro, that email's already taken. You're not that NPC.",
  "Password should be at least 6 characters": "Password too weak fam. Minimum 6 chars or you're cooked.",
  "Invalid email": "That email is giving Ohio energy. Try again.",
  default: "Something went wrong. That's not very sigma of us.",
};

function getBrainrotError(message: string): string {
  return BRAINROT_ERRORS[message] || BRAINROT_ERRORS.default;
}

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      setError("Fill in all the fields or you're literally an NPC.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp(email, password, username);
    } catch (err: any) {
      setError(getBrainrotError(err.message || ""));
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
        <Text style={styles.header}>BEGIN YOUR{"\n"}AURA ORIGIN STORY</Text>
        <Text style={styles.sub}>
          CREATE YOUR ACCOUNT · START THE GRIND
        </Text>

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
          <Text style={styles.label}>Username (unique)</Text>
          <TextInput
            style={styles.input}
            placeholder="xX_SigmaBoy_Xx"
            placeholderTextColor={COLORS.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="min 6 chars no cap"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.textPrimary} />
          ) : (
            <Text style={styles.buttonText}>{"Let's Cook"}</Text>
          )}
        </TouchableOpacity>

        <Link href="/auth/signin" asChild>
          <TouchableOpacity style={styles.linkWrap}>
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.linkAccent}>Sign in</Text>
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
