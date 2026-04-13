import { create } from "zustand";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "aurate_onboarding_complete";

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
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  setPath: (path: string) => void;
  checkOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  onboardingComplete: null,

  signUp: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: username } },
    });
    if (error) throw error;
    if (data.user) {
      set({ user: data.user });
      await get().fetchProfile();
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ user: data.user });
    await get().fetchProfile();
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, onboardingComplete: null });
  },

  fetchProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    set({ user, profile: data, loading: false });
  },

  setPath: (path) => {
    set((state) => ({ profile: state.profile ? { ...state.profile, current_path: path } : null }));
  },

  checkOnboarding: async () => {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    set({ onboardingComplete: val === "true" });
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    set({ onboardingComplete: true });
  },
}));
