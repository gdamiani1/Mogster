import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ErrorType = "network" | "rateLimit" | "generic";

const ERROR_MESSAGES: Record<ErrorType, string> = {
  network: "The servers crashed out. L.",
  rateLimit: "Daily limit hit. Watch an ad or come back tomorrow.",
  generic: "Something went wrong ngl. Try again.",
};

interface ErrorStateProps {
  type?: ErrorType;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  type = "generic",
  message,
  onRetry,
}: ErrorStateProps) {
  const displayMessage = message ?? ERROR_MESSAGES[type];

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{type === "network" ? "\u{1F4A8}" : type === "rateLimit" ? "\u{1F6AB}" : "\u{1F480}"}</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    padding: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  message: {
    color: "#E4E4E7",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 26,
  },
  retryButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
