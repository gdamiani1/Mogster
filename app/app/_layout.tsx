import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Anton_400Regular } from "@expo-google-fonts/anton";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { Bungee_400Regular } from "@expo-google-fonts/bungee";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/store/authStore";
import RootErrorBoundary from "../src/components/RootErrorBoundary";
import { capture as captureAnalytics, identify as identifyAnalytics } from "../src/lib/analytics";

function parseTokensFromMogsterUrl(
  url: string
): { accessToken: string; refreshToken: string } | null {
  // Expect: mogster://auth/callback#access_token=…&refresh_token=…
  try {
    const { scheme, hostname, path } = Linking.parse(url);
    if (scheme !== "mogster") return null;
    if (hostname !== "auth") return null;
    if (path !== "callback") return null;

    // Supabase returns tokens in the URL hash — Linking.parse does NOT read the
    // hash fragment, so extract it manually.
    const hashIdx = url.indexOf("#");
    if (hashIdx === -1) return null;
    const params = new URLSearchParams(url.slice(hashIdx + 1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync().catch(() => {
  // Fails silently if splash is already hidden or native module unavailable
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    Anton_400Regular,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
    Bungee_400Regular,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      // Don't crash on font load errors — just log and continue with system fonts
      console.warn("Font load error:", error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <RootErrorBoundary>
      <RootLayoutNav />
    </RootErrorBoundary>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();

  const user = useAuthStore((s) => s.user);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const checkOnboarding = useAuthStore((s) => s.checkOnboarding);

  const [authReady, setAuthReady] = useState(false);

  /* Cold-start app_open event */
  useEffect(() => {
    captureAnalytics("app_open", { type: "cold" });
  }, []);

  /* Listen for Supabase auth state changes */
  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          try {
            useAuthStore.setState({ user: session?.user ?? null });
            if (session?.user) {
              identifyAnalytics(session.user.id, { email: session.user.email });
              fetchProfile().catch((e) => console.warn("fetchProfile failed:", e));
            }
            setAuthReady(true);
          } catch (e) {
            console.warn("Auth state change handler failed:", e);
            setAuthReady(true);
          }
        }
      );
      unsub = () => subscription.unsubscribe();

      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          useAuthStore.setState({ user: session?.user ?? null, loading: false });
          if (session?.user) {
            fetchProfile().catch((e) => console.warn("fetchProfile failed:", e));
          }
          setAuthReady(true);
        })
        .catch((e) => {
          console.warn("getSession failed:", e);
          useAuthStore.setState({ user: null, loading: false });
          setAuthReady(true);
        });
    } catch (e) {
      console.warn("Auth init failed:", e);
      setAuthReady(true);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  /* Handle mogster:// deep links — auth callback + notification-tap targets */
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;

      // 1. Auth callback — set session then bail
      const tokens = parseTokensFromMogsterUrl(url);
      if (tokens) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          });
          if (error) {
            console.warn("Failed to set session from deep link:", error.message);
            return;
          }
          await useAuthStore.getState().fetchProfile();
        } catch (e) {
          console.warn("Deep-link session handling failed:", e);
        }
        return;
      }

      // 2. Battles deep links from notifications
      try {
        const { scheme, hostname, path } = Linking.parse(url);
        if (scheme !== "mogster") return;
        if (hostname === "battles") {
          if (path && path.startsWith("reveal/")) {
            const battleId = path.slice("reveal/".length);
            router.push(`/battles/reveal/${battleId}` as any);
          } else {
            router.push("/(tabs)/battles" as any);
          }
        }
      } catch (e) {
        console.warn("Deep-link routing failed:", e);
      }
    };

    Linking.getInitialURL()
      .then(handleUrl)
      .catch((e) => console.warn("getInitialURL failed:", e));

    const linkSub = Linking.addEventListener("url", (e) => {
      handleUrl(e.url);
    });

    // Route notification taps via the same handler
    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === "string" && url.length > 0) {
        handleUrl(url);
      }
    });

    return () => {
      linkSub.remove();
      notifSub.remove();
    };
  }, []);

  /* Check onboarding status */
  useEffect(() => {
    checkOnboarding().catch((e) => console.warn("checkOnboarding failed:", e));
  }, [user]);

  /* Route guard */
  useEffect(() => {
    if (!authReady || onboardingComplete === null) return;

    const inAuthGroup = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    try {
      if (!user) {
        if (!inAuthGroup) {
          router.replace("/auth/signup");
        }
      } else if (!onboardingComplete) {
        if (!inOnboarding) {
          router.replace("/onboarding");
        }
      } else {
        if (inAuthGroup || inOnboarding) {
          router.replace("/(tabs)");
        }
      }
    } catch (e) {
      console.warn("Route guard navigation failed:", e);
    }
  }, [user, authReady, onboardingComplete, segments]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="aura/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="battles/challenge/[friendId]" />
        <Stack.Screen name="battles/accept/[battleId]" />
        <Stack.Screen name="battles/reveal/[battleId]" options={{ gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}
