import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/store/authStore";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();

  const user = useAuthStore((s) => s.user);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const checkOnboarding = useAuthStore((s) => s.checkOnboarding);

  const [authReady, setAuthReady] = useState(false);

  /* Listen for Supabase auth state changes */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        useAuthStore.setState({ user: session?.user ?? null });
        if (session?.user) {
          fetchProfile();
        }
        setAuthReady(true);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      useAuthStore.setState({ user: session?.user ?? null, loading: false });
      if (session?.user) {
        fetchProfile();
      }
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* Check onboarding status */
  useEffect(() => {
    checkOnboarding();
  }, [user]);

  /* Route guard */
  useEffect(() => {
    if (!authReady || onboardingComplete === null) return;

    const inAuthGroup = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

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
  }, [user, authReady, onboardingComplete, segments]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}
