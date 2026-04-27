import { createHash } from "crypto";
import { checkBlocklist, BlocklistResult } from "../lib/blocklist";
import { getStrikeStatus } from "../lib/strikes";
import { redis } from "../lib/redis";
import { supabase } from "../lib/supabase";
import { ModerationBlockError } from "../ai/errors";

const DAILY_BUDGET = 5_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type ModerationEventType =
  | "gemini_safety"
  | "output_blocklist"
  | "provider_error"
  | "system_busy";

export type CopyTier = "A" | "B" | "C";

export interface ModerationResult {
  allow: boolean;
  eventType?: ModerationEventType;
  copyTier?: CopyTier;
  softLockedUntil?: Date;
  hardLocked?: boolean;
  retryAllowed?: boolean;
}

interface PreCheckOpts {
  userId?: string;
  ipAddress?: string;
  sigmaPath?: string;
  requestId?: string;
}

/**
 * Runs BEFORE the Gemini call. Short-circuits on hard-lock or budget cap.
 * Returns allow=true if the request should proceed to Gemini.
 */
export async function preCheck(opts: PreCheckOpts): Promise<ModerationResult> {
  const { userId, ipAddress, sigmaPath, requestId } = opts;

  // Strike check (short-circuit hard-lock)
  const strikes = await getStrikeStatus({ userId, ipAddress });
  if (strikes.locked === "hard") {
    return {
      allow: false,
      eventType: "gemini_safety",
      copyTier: "C",
      hardLocked: true,
      retryAllowed: false,
    };
  }

  // Cost circuit breaker on Gemini calls
  const today = new Date().toISOString().split("T")[0];
  const dailyKey = `gemini:calls:${today}`;
  const count = await redis.incr(dailyKey);
  if (count === 1) await redis.expire(dailyKey, 86_400);
  if (count > DAILY_BUDGET) {
    await logEvent({
      userId,
      ipAddress,
      sigmaPath,
      requestId,
      event_type: "system_busy",
      severity: "reject",
      provider: "internal",
      provider_response: { dailyCount: count },
    });
    return {
      allow: false,
      eventType: "system_busy",
      copyTier: "A",
      retryAllowed: true,
    };
  }

  return { allow: true };
}

interface HandleSafetyOpts {
  userId?: string;
  ipAddress?: string;
  sigmaPath?: string;
  imageBuffer: Buffer;
  requestId?: string;
}

/**
 * Runs AFTER a ModerationBlockError is thrown by rate.ts.
 * Logs the event, computes copy tier from current strike count,
 * returns a ModerationResult the route handler returns as a 403 body.
 */
export async function handleSafetyBlock(
  err: ModerationBlockError,
  opts: HandleSafetyOpts
): Promise<ModerationResult> {
  const { userId, ipAddress, sigmaPath, imageBuffer, requestId } = opts;

  const strikes = await getStrikeStatus({ userId, ipAddress });
  const copyTier: CopyTier =
    strikes.recentRejects24h >= 2 ? "C" : strikes.recentRejects24h === 1 ? "B" : "A";

  await logEvent({
    userId,
    ipAddress,
    sigmaPath,
    requestId,
    event_type: "gemini_safety",
    severity: "reject",
    provider: "gemini",
    provider_response: err.safetyRatings,
    image_sha256: createHash("sha256").update(imageBuffer).digest("hex"),
    attempt_number: strikes.recentRejects24h + 1,
  });

  const newCount24h = strikes.recentRejects24h + 1;
  const softLockedUntil = newCount24h >= 3 ? new Date(Date.now() + ONE_DAY_MS) : undefined;

  return {
    allow: false,
    eventType: "gemini_safety",
    copyTier,
    softLockedUntil,
    retryAllowed: copyTier !== "C",
  };
}

/**
 * Output text gate. Pure function — runs after Gemini returns the roast.
 * Returns flagged=true if text hit a blocklist category. The caller decides
 * whether to regenerate or substitute the safe fallback.
 */
export function moderateOutput(text: string): BlocklistResult {
  return checkBlocklist(text);
}

interface LogParams {
  userId?: string;
  ipAddress?: string;
  sigmaPath?: string;
  requestId?: string;
  event_type: ModerationEventType;
  severity: "reject" | "regenerated" | "soft_flag";
  provider: string;
  provider_response?: unknown;
  matched_term?: string;
  image_sha256?: string;
  attempt_number?: number;
}

export async function logEvent(p: LogParams): Promise<void> {
  await supabase.from("moderation_events").insert({
    user_id: p.userId ?? null,
    ip_address: p.ipAddress ?? null,
    event_type: p.event_type,
    severity: p.severity,
    provider: p.provider,
    provider_response: p.provider_response ?? null,
    matched_term: p.matched_term ?? null,
    image_sha256: p.image_sha256 ?? null,
    sigma_path: p.sigmaPath ?? null,
    attempt_number: p.attempt_number ?? 1,
    request_id: p.requestId ?? null,
  });
}

export const SAFE_FALLBACK_ROAST = {
  roast: "the AI couldn't read this one. vibes were too chaotic. try again.",
  personality_read: "system overload detected — recalibrating...",
};
