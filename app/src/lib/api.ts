import { supabase } from "./supabase";

export const API_URL = "https://mogster-production.up.railway.app";

export type CopyTier = "A" | "B" | "C";

/**
 * Thrown by checkAura() when the server returns a 403 with
 * `{ error: "AURA_UNREADABLE", copy_tier, retry_allowed, ... }`.
 * Caller should render <ModerationRejectCard /> instead of a normal error.
 */
export class ModerationError extends Error {
  copyTier: CopyTier;
  retryAllowed: boolean;
  hardLocked: boolean;
  retryAfter?: string;

  constructor(payload: {
    copy_tier?: CopyTier;
    retry_allowed?: boolean;
    hard_locked?: boolean;
    retry_after?: string;
  }) {
    super("AURA_UNREADABLE");
    this.name = "ModerationError";
    this.copyTier = payload.copy_tier ?? "A";
    this.retryAllowed = payload.retry_allowed === true;
    this.hardLocked = payload.hard_locked === true;
    this.retryAfter = payload.retry_after;
  }
}

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
