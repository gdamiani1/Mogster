import { supabase } from "./supabase";

export type LockState = "none" | "soft" | "hard";

export interface StrikeStatus {
  locked: LockState;
  recentRejects24h: number;
  recentRejects7d: number;
  lockedUntil?: Date;
}

const SOFT_THRESHOLD_24H = 3;
const HARD_THRESHOLD_7D = 5;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function getStrikeStatus(params: {
  userId?: string;
  ipAddress?: string;
}): Promise<StrikeStatus> {
  const { userId, ipAddress } = params;
  if (!userId && !ipAddress) {
    return { locked: "none", recentRejects24h: 0, recentRejects7d: 0 };
  }

  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const idCol = userId ? "user_id" : "ip_address";
  const idVal = userId ?? ipAddress;

  const { data, error } = await supabase
    .from("moderation_events")
    .select("created_at")
    .eq(idCol, idVal)
    .gte("created_at", sevenDaysAgo)
    .in("severity", ["reject"]);

  if (error || !data) {
    return { locked: "none", recentRejects24h: 0, recentRejects7d: 0 };
  }

  const now = Date.now();
  const oneDayAgo = now - ONE_DAY_MS;
  const recent24h = data.filter((r: any) => new Date(r.created_at).getTime() > oneDayAgo).length;
  const recent7d = data.length;

  let locked: LockState = "none";
  let lockedUntil: Date | undefined;

  if (recent7d >= HARD_THRESHOLD_7D) {
    locked = "hard";
  } else if (recent24h >= SOFT_THRESHOLD_24H) {
    locked = "soft";
    lockedUntil = new Date(now + ONE_DAY_MS);
  }

  return { locked, recentRejects24h: recent24h, recentRejects7d: recent7d, lockedUntil };
}
