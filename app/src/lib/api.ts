import { supabase } from "./supabase";

export const API_URL = "https://mogster-production.up.railway.app";

/**
 * Fetch wrapper that automatically attaches the Supabase JWT.
 */
export async function authedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in. Sign in again fr.");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${session.access_token}`,
  };

  return fetch(`${API_URL}${path}`, { ...options, headers });
}
