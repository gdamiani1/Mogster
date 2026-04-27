import { create } from "zustand";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { capture, identify, reset } from "../lib/analytics";

const ONBOARDING_KEY = "mogster_onboarding_complete";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  current_path: string;
  total_aura_points: number;
  peak_aura: number;
  current_streak: number;
  longest_streak: number;
  tier: string;
}

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  onboardingComplete: boolean | null;
  signUp: (email: string, password: string, username: string, dob: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  setPath: (path: string) => void;
  checkOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  onboardingComplete: null,

  signUp: async (email, password, username, dob) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username, dob },
        emailRedirectTo: 'https://mogster.app/auth/confirm',
      },
    });
    if (error) throw error;
    if (data.user) {
      set({ user: data.user });
      identify(data.user.id, { email: data.user.email });
      capture("signup_completed", { has_dob: true });
      await get().fetchProfile();
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ user: data.user });
    if (data.user) {
      identify(data.user.id, { email: data.user.email });
      capture("signin_completed");
    }
    await get().fetchProfile();
  },

  signOut: async () => {
    await supabase.auth.signOut();
    reset();
    set({ user: null, profile: null, onboardingComplete: null });
  },

  updateUsername: async (username: string) => {
    const trimmed = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      throw new Error("Username must be 3-20 chars, lowercase letters, numbers, underscores only.");
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { error } = await supabase
      .from("profiles")
      .update({ username: trimmed, display_name: trimmed })
      .eq("id", user.id);
    if (error) {
      if (error.code === "23505" || error.message?.includes("duplicate")) {
        throw new Error("That username is taken, bro.");
      }
      throw new Error(error.message);
    }
    await get().fetchProfile();
  },

  setPath: (path) => {
    set((state) => ({ profile: state.profile ? { ...state.profile, current_path: path } : null }));
  },

  checkOnboarding: async () => {
    try {
      const val = await AsyncStorage.getItem(ONBOARDING_KEY);
      set({ onboardingComplete: val === "true" });
    } catch (e) {
      console.warn("checkOnboarding failed, defaulting to not-complete:", e);
      set({ onboardingComplete: false });
    }
  },

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    } catch (e) {
      console.warn("completeOnboarding setItem failed:", e);
    }
    capture("onboarding_complete");
    set({ onboardingComplete: true });
  },

  fetchProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      set({ user, profile: data, loading: false });
    } catch (e) {
      console.warn("fetchProfile failed:", e);
      set({ loading: false });
    }
  },
}));
