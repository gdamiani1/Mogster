import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Hardcoded for production reliability — env vars were unreliable in EAS builds
const supabaseUrl = "https://zyjndqfhueqxcbmtmdfc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5am5kcWZodWVxeGNibXRtZGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNzY0MjQsImV4cCI6MjA5MTY1MjQyNH0.q80aHHvK_W1O4FJpM2LxvCG339kNQy92cdGYLQH6ScY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
