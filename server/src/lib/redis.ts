import Redis from "ioredis";

export const redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
  tls: { rejectUnauthorized: false },
});

export const LEADERBOARD_KEYS = {
  global: "leaderboard:global",
  path: (path: string) => `leaderboard:path:${path}`,
  friends: (userId: string) => `leaderboard:friends:${userId}`,
} as const;
