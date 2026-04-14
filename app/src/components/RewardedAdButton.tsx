import React, { useCallback, useEffect, useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { loadRewardedAd, showRewardedAd } from "../lib/ads";
import { supabase } from "../lib/supabase";

interface RewardedAdButtonProps {
  /** Called after the user earns the reward and the server acknowledges it */
  onRewardEarned?: () => void;
}

export default function RewardedAdButton({
  onRewardEarned,
}: RewardedAdButtonProps) {
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    loadRewardedAd();
  }, []);

  const handlePress = useCallback(async () => {
    setLoading(true);
    try {
      const earned = await showRewardedAd();
      if (earned) {
        // Grant extra check via API (decrement daily usage counter)
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          await fetch(
            `${process.env.EXPO_PUBLIC_API_URL}/api/checks/grant-extra`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
            }
          );
        }
        onRewardEarned?.();
      }
    } catch (err) {
      console.error("Rewarded ad error:", err);
    } finally {
      setLoading(false);
    }
  }, [onRewardEarned]);

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={handlePress}
      disabled={loading || disabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.text}>Watch ad for +1 check 📺</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
