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
import { Link, router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  if (message.includes("profiles_age_16_check") || message.includes("AGE_RESTRICTED")) {
    return "Mogster is for ages 16 and up. come back when you're cooking.";
  }
  return BRAINROT_ERRORS[message] || BRAINROT_ERRORS.default;
}

function computeAgeYears(dob: Date): number {
  return (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

function formatIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      setError("Fill in all the fields or you're literally an NPC.");
      return;
    }
    if (!dob) {
      setError("Pick your date of birth fam.");
      return;
    }
    if (computeAgeYears(dob) < 16) {
      setError("Mogster is for ages 16 and up. come back when you're cooking.");
      return;
    }
    if (!ageConfirmed) {
      setError("Confirm you're 16+ to continue.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signUp(email, password, username, formatIsoDate(dob));
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

        <View style={styles.field}>
          <Text style={styles.label}>Date of birth</Text>
          <TouchableOpacity
            style={styles.dobButton}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.85}
          >
            <Text style={[styles.dobText, !dob && styles.dobPlaceholder]}>
              {dob ? formatIsoDate(dob) : "TAP TO PICK"}
            </Text>
          </TouchableOpacity>
        </View>

        {showPicker && (
          <DateTimePicker
            value={dob ?? new Date(2008, 0, 1)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            maximumDate={new Date()}
            onChange={(_, d) => {
              setShowPicker(Platform.OS === "ios");
              if (d) setDob(d);
            }}
            themeVariant="dark"
          />
        )}

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAgeConfirmed(!ageConfirmed)}
          activeOpacity={0.7}
        >
          <View
            style={[styles.checkbox, ageConfirmed && styles.checkboxChecked]}
          >
            {ageConfirmed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I'm 16+ and agree to the{" "}
            <Text
              style={styles.link}
              onPress={() => router.push("https://mogster.app/terms" as never)}
            >
              Terms
            </Text>
            .
          </Text>
        </TouchableOpacity>

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
  dobButton: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dobText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.mono,
    letterSpacing: 1,
  },
  dobPlaceholder: { color: COLORS.textMuted, letterSpacing: 1.5, fontSize: 13 },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 14,
  },
  checkboxLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  link: { color: COLORS.primary, textDecorationLine: "underline" },
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
