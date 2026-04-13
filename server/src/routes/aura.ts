import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { supabase } from "../lib/supabase";
import { redis, LEADERBOARD_KEYS } from "../lib/redis";
import { rateAura } from "../ai/rate";
import { SigmaPath, SIGMA_PATHS } from "../ai/types";

export async function auraRoutes(app: FastifyInstance) {
  app.register(multipart, { limits: { fileSize: 10_000_000 } });

  // Drop a Pic — the core aura check
  app.post("/aura/check", async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No pic detected. Drop a pic fr" });

    const userId = request.headers["x-user-id"] as string;
    const sigmaPath = (request.headers["x-sigma-path"] as SigmaPath) || "auramaxxing";

    if (!SIGMA_PATHS[sigmaPath]) {
      return reply.status(400).send({ error: "Invalid sigma path. That's not a real archetype ngl" });
    }

    // Check daily limit (3 free checks) — disabled for dev
    const today = new Date().toISOString().split("T")[0];
    const checkCount = await redis.get(`checks:${userId}:${today}`);
    // if (Number(checkCount) >= 3) {
    //   return reply.status(429).send({
    //     error: "Daily limit hit. Watch an ad to unlock more checks or wait till tomorrow.",
    //     checks_remaining: 0,
    //   });
    // }

    const buffer = await data.toBuffer();
    const imageBase64 = buffer.toString("base64");

    // Upload to Supabase Storage
    const fileName = `${userId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("aura-pics")
      .upload(fileName, buffer, { contentType: "image/jpeg" });
    if (uploadError) return reply.status(500).send({ error: "Failed to upload pic. The servers are cooked rn" });

    const { data: urlData } = supabase.storage.from("aura-pics").getPublicUrl(fileName);

    // AI Rating
    const result = await rateAura(imageBase64, sigmaPath);

    // Save to DB
    const { data: check, error: dbError } = await supabase
      .from("aura_checks")
      .insert({
        user_id: userId, image_url: urlData.publicUrl, sigma_path: sigmaPath,
        aura_score: result.aura_score, personality_read: result.personality_read,
        roast: result.roast, aura_color: result.aura_color, tier: result.tier,
      })
      .select().single();
    if (dbError) return reply.status(500).send({ error: "DB crashed out. Try again." });

    // Update leaderboards
    await redis.zadd(LEADERBOARD_KEYS.global, { score: result.aura_score, member: userId });
    await redis.zadd(LEADERBOARD_KEYS.path(sigmaPath), { score: result.aura_score, member: userId });

    // Update profile stats
    await supabase.rpc("update_profile_stats", { p_user_id: userId, p_score: result.aura_score, p_tier: result.tier });

    // Increment daily check count
    await redis.incr(`checks:${userId}:${today}`);
    await redis.expire(`checks:${userId}:${today}`, 86400);

    return { ...result, check_id: check.id, image_url: urlData.publicUrl, checks_remaining: 3 - (Number(checkCount) + 1) };
  });

  // Get aura history
  app.get("/aura/history/:userId", async (request) => {
    const { userId } = request.params as { userId: string };
    const { data } = await supabase
      .from("aura_checks").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(50);
    return { checks: data || [] };
  });
}
