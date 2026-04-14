import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { supabase } from "../lib/supabase";
import { redis, LEADERBOARD_KEYS } from "../lib/redis";
import { rateAura } from "../ai/rate";
import { SigmaPath, SIGMA_PATHS } from "../ai/types";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const DAILY_LIMIT = 15;

export async function auraRoutes(app: FastifyInstance) {
  app.register(multipart, { limits: { fileSize: 10_000_000 } });

  // Drop a Pic — the core aura check (AUTH REQUIRED)
  app.post("/aura/check", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const userId = request.userId!;
    const unlimited = request.unlimitedChecks === true;

    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No pic detected. Drop a pic fr" });

    // Validate MIME type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({ error: "That file ain't a pic bro. Send a JPEG or PNG." });
    }

    const sigmaPath = (request.headers["x-sigma-path"] as SigmaPath) || "auramaxxing";
    if (!SIGMA_PATHS[sigmaPath]) {
      return reply.status(400).send({ error: "Invalid sigma path. That's not a real archetype ngl" });
    }

    // Rate limit: 15 checks/day unless user has unlimited_checks flag
    const today = new Date().toISOString().split("T")[0];
    const checkKey = `checks:${userId}:${today}`;
    const checkCount = Number((await redis.get(checkKey)) || 0);

    if (!unlimited && checkCount >= DAILY_LIMIT) {
      return reply.status(429).send({
        error: `Daily limit hit (${DAILY_LIMIT} checks). Come back tomorrow or cook less fr.`,
        checks_remaining: 0,
        daily_limit: DAILY_LIMIT,
      });
    }

    const buffer = await data.toBuffer();
    const imageBase64 = buffer.toString("base64");

    // Upload to Supabase Storage
    const fileName = `${userId}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("aura-pics")
      .upload(fileName, buffer, { contentType: data.mimetype });
    if (uploadError) return reply.status(500).send({ error: "Failed to upload pic. The servers are cooked rn" });

    const { data: urlData } = supabase.storage.from("aura-pics").getPublicUrl(fileName);

    // AI Rating
    const result = await rateAura(imageBase64, sigmaPath);

    // Save to DB
    const { data: check, error: dbError } = await supabase
      .from("aura_checks")
      .insert({
        user_id: userId,
        image_url: urlData.publicUrl,
        sigma_path: sigmaPath,
        aura_score: result.aura_score,
        personality_read: result.personality_read,
        roast: result.roast,
        aura_color: result.aura_color,
        tier: result.tier,
        stats: result.stats,
      })
      .select()
      .single();
    if (dbError) return reply.status(500).send({ error: "DB crashed out. Try again." });

    // Update leaderboards
    await redis.zadd(LEADERBOARD_KEYS.global, { score: result.aura_score, member: userId });
    await redis.zadd(LEADERBOARD_KEYS.path(sigmaPath), { score: result.aura_score, member: userId });

    // Update profile stats
    await supabase.rpc("update_profile_stats", {
      p_user_id: userId,
      p_score: result.aura_score,
      p_tier: result.tier,
    });

    // Increment daily check count
    await redis.incr(checkKey);
    await redis.expire(checkKey, 86400);

    return {
      ...result,
      check_id: check.id,
      image_url: urlData.publicUrl,
      checks_remaining: unlimited ? -1 : DAILY_LIMIT - (checkCount + 1),
      daily_limit: unlimited ? null : DAILY_LIMIT,
    };
  });

  // Get aura history (AUTH REQUIRED, only own)
  app.get("/aura/history/:userId", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const { userId } = request.params as { userId: string };
    const { saved } = request.query as { saved?: string };

    if (userId !== request.userId) {
      return reply.status(403).send({ error: "That ain't your aura history bro." });
    }

    let query = supabase
      .from("aura_checks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (saved === "true") {
      query = query.eq("is_saved", true);
    }

    const { data } = await query;
    return { checks: data || [] };
  });

  // Toggle saved status on a specific check
  app.patch("/aura/check/:checkId/save", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const { checkId } = request.params as { checkId: string };
    const { saved } = request.body as { saved: boolean };

    // Verify ownership
    const { data: check } = await supabase
      .from("aura_checks")
      .select("user_id, is_saved")
      .eq("id", checkId)
      .single();

    if (!check) return reply.status(404).send({ error: "Check not found." });
    if (check.user_id !== request.userId) {
      return reply.status(403).send({ error: "That ain't your check bro." });
    }

    const { error } = await supabase
      .from("aura_checks")
      .update({ is_saved: saved })
      .eq("id", checkId);

    if (error) return reply.status(500).send({ error: "Failed to update. Try again." });
    return { is_saved: saved };
  });
}
