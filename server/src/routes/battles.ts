import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { supabase } from "../lib/supabase";
import { rateAura } from "../ai/rate";
import { generateFightNarrative, fallbackNarrative, FighterSummary } from "../ai/battle";
import { pickWinner, classifyMargin, BattleMargin } from "../battles/helpers";
import { SigmaPath, SIGMA_PATHS } from "../ai/types";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { sendPush } from "../lib/push";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isCameraSource(request: AuthedRequest): boolean {
  return (request.headers["x-source"] as string | undefined) === "camera";
}

async function uploadBattlePhoto(
  userId: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  const fileName = `${userId}/battle-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("aura-pics")
    .upload(fileName, buffer, { contentType: mimetype });
  if (error) throw new Error("Upload failed");
  const { data } = supabase.storage.from("aura-pics").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function battleRoutes(app: FastifyInstance) {
  app.register(multipart, { limits: { fileSize: 10_000_000 } });

  // ─── Create battle ───
  app.post("/battles/create", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    if (!isCameraSource(request)) {
      return reply.status(400).send({ error: "Battles require camera only bro" });
    }

    const challengerId = request.userId!;
    const opponentUsername = request.headers["x-opponent-username"] as string;
    const sigmaPath = request.headers["x-sigma-path"] as SigmaPath;

    if (!opponentUsername) return reply.status(400).send({ error: "Missing opponent username" });
    if (!SIGMA_PATHS[sigmaPath]) return reply.status(400).send({ error: "Invalid sigma path" });

    // Look up opponent
    const { data: opponent } = await supabase
      .from("profiles").select("id, username").eq("username", opponentUsername).single();
    if (!opponent) return reply.status(404).send({ error: "Opponent not found" });
    if (opponent.id === challengerId) return reply.status(400).send({ error: "Can't battle yourself" });

    // Must be accepted friends
    const { data: friendship } = await supabase
      .from("friendships").select("id")
      .or(`and(requester_id.eq.${challengerId},addressee_id.eq.${opponent.id}),and(requester_id.eq.${opponent.id},addressee_id.eq.${challengerId})`)
      .eq("status", "accepted")
      .maybeSingle();
    if (!friendship) return reply.status(403).send({ error: "Only friends can battle" });

    // No existing pending battle between pair
    const { data: pending } = await supabase
      .from("battles").select("id")
      .or(`and(challenger_id.eq.${challengerId},opponent_id.eq.${opponent.id}),and(challenger_id.eq.${opponent.id},opponent_id.eq.${challengerId})`)
      .eq("status", "awaiting_opponent")
      .maybeSingle();
    if (pending) return reply.status(409).send({ error: "You already have a pending battle with this user" });

    // 24h loss cooldown check
    const cooldownCutoff = new Date(Date.now() - ONE_DAY_MS).toISOString();
    const { data: recentLoss } = await supabase
      .from("battles").select("id")
      .eq("winner_id", opponent.id)
      .or(`challenger_id.eq.${challengerId},opponent_id.eq.${challengerId}`)
      .gt("completed_at", cooldownCutoff)
      .maybeSingle();
    if (recentLoss) return reply.status(429).send({ error: "You can't rematch for 24h after a loss bro" });

    // Read photo
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No pic detected" });
    if (!["image/jpeg", "image/png"].includes(data.mimetype)) {
      return reply.status(400).send({ error: "JPEG or PNG only" });
    }
    const buffer = await data.toBuffer();

    // Upload photo
    const imageUrl = await uploadBattlePhoto(challengerId, buffer, data.mimetype);

    // Rate challenger photo (reuses existing AI pipeline)
    const result = await rateAura(buffer.toString("base64"), sigmaPath);

    // Insert aura_check row for challenger
    const { data: check, error: checkErr } = await supabase
      .from("aura_checks")
      .insert({
        user_id: challengerId,
        image_url: imageUrl,
        sigma_path: sigmaPath,
        aura_score: result.aura_score,
        personality_read: result.personality_read,
        roast: result.roast,
        aura_color: result.aura_color,
        tier: result.tier,
        stats: result.stats,
      }).select().single();
    if (checkErr) return reply.status(500).send({ error: "DB insert failed" });

    // Insert battle row
    const expiresAt = new Date(Date.now() + ONE_DAY_MS).toISOString();
    const { data: battle, error: battleErr } = await supabase
      .from("battles")
      .insert({
        challenger_id: challengerId,
        opponent_id: opponent.id,
        sigma_path: sigmaPath,
        challenger_check_id: check.id,
        expires_at: expiresAt,
      }).select().single();
    if (battleErr) return reply.status(500).send({ error: "Battle create failed" });

    return { battle_id: battle.id, expires_at: expiresAt };
  });

  // ─── Accept battle (opponent submits photo) ───
  app.post("/battles/:battleId/accept", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    if (!isCameraSource(request)) {
      return reply.status(400).send({ error: "Battles require camera only bro" });
    }

    const { battleId } = request.params as { battleId: string };
    const opponentId = request.userId!;

    // Load battle + verify
    const { data: battle } = await supabase
      .from("battles").select("*").eq("id", battleId).single();
    if (!battle) return reply.status(404).send({ error: "Battle not found" });
    if (battle.opponent_id !== opponentId) return reply.status(403).send({ error: "Not your battle to accept" });
    if (battle.status !== "awaiting_opponent") return reply.status(409).send({ error: "Battle already resolved" });
    if (new Date(battle.expires_at).getTime() < Date.now()) {
      // Auto-mark expired
      await supabase.from("battles").update({ status: "expired" }).eq("id", battleId);
      return reply.status(410).send({ error: "Battle expired" });
    }

    // Read opponent photo
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No pic detected" });
    if (!["image/jpeg", "image/png"].includes(data.mimetype)) {
      return reply.status(400).send({ error: "JPEG or PNG only" });
    }
    const buffer = await data.toBuffer();

    // Upload + rate
    const imageUrl = await uploadBattlePhoto(opponentId, buffer, data.mimetype);
    const result = await rateAura(buffer.toString("base64"), battle.sigma_path as SigmaPath);

    // Insert opponent aura_check
    const { data: oppCheck, error: oppCheckErr } = await supabase
      .from("aura_checks").insert({
        user_id: opponentId,
        image_url: imageUrl,
        sigma_path: battle.sigma_path,
        aura_score: result.aura_score,
        personality_read: result.personality_read,
        roast: result.roast,
        aura_color: result.aura_color,
        tier: result.tier,
        stats: result.stats,
      }).select().single();
    if (oppCheckErr) return reply.status(500).send({ error: "DB insert failed" });

    // Load challenger check (need score + stats for winner calc)
    const { data: challengerCheck } = await supabase
      .from("aura_checks").select("*").eq("id", battle.challenger_check_id).single();
    if (!challengerCheck) return reply.status(500).send({ error: "Challenger check missing" });

    // Determine winner
    const winnerResult = pickWinner(
      { userId: battle.challenger_id, score: challengerCheck.aura_score, stats: challengerCheck.stats || [] },
      { userId: opponentId, score: oppCheck.aura_score, stats: oppCheck.stats || [] }
    );

    let margin: BattleMargin = "DRAW";
    if (winnerResult.winnerId !== "draw") {
      const winnerScore = winnerResult.winnerId === battle.challenger_id ? challengerCheck.aura_score : oppCheck.aura_score;
      const loserScore = winnerResult.winnerId === battle.challenger_id ? oppCheck.aura_score : challengerCheck.aura_score;
      margin = classifyMargin(winnerScore, loserScore);
    }

    // Usernames for narrative
    const { data: profiles } = await supabase
      .from("profiles").select("id, username, battle_wins, battle_losses, battle_draws, battle_streak")
      .in("id", [battle.challenger_id, opponentId]);
    const challengerProfile = profiles?.find((p) => p.id === battle.challenger_id);
    const opponentProfile = profiles?.find((p) => p.id === opponentId);

    const challengerSummary: FighterSummary = {
      username: challengerProfile?.username || "challenger",
      score: challengerCheck.aura_score,
      stats: challengerCheck.stats || [],
      roast: challengerCheck.roast,
    };
    const opponentSummary: FighterSummary = {
      username: opponentProfile?.username || "opponent",
      score: oppCheck.aura_score,
      stats: oppCheck.stats || [],
      roast: oppCheck.roast,
    };

    const winnerUsername =
      winnerResult.winnerId === "draw"
        ? "draw"
        : winnerResult.winnerId === battle.challenger_id
        ? challengerSummary.username
        : opponentSummary.username;

    // Generate narrative (with fallback if Gemini fails)
    let narrative;
    try {
      narrative = await generateFightNarrative({
        challenger: challengerSummary,
        opponent: opponentSummary,
        sigmaPath: battle.sigma_path,
        winnerId: winnerUsername,
        margin,
      });
    } catch (err) {
      app.log.error({ err }, "Narrative generation failed, using fallback");
      narrative = fallbackNarrative(challengerSummary, opponentSummary, winnerUsername, margin);
    }

    // Update battle row
    await supabase.from("battles").update({
      opponent_check_id: oppCheck.id,
      winner_id: winnerResult.winnerId === "draw" ? null : winnerResult.winnerId,
      margin,
      narrative,
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", battle.id);

    // Update both profiles' records
    if (winnerResult.winnerId === "draw") {
      await supabase.from("profiles").update({
        battle_draws: ((challengerProfile as any)?.battle_draws ?? 0) + 1,
        battle_streak: 0,
      }).eq("id", battle.challenger_id);
      await supabase.from("profiles").update({
        battle_draws: ((opponentProfile as any)?.battle_draws ?? 0) + 1,
        battle_streak: 0,
      }).eq("id", opponentId);
    } else {
      const winnerId = winnerResult.winnerId;
      const loserId = winnerResult.loserId!;
      const winnerProfile = profiles?.find((p) => p.id === winnerId) as any;
      const loserProfile = profiles?.find((p) => p.id === loserId) as any;
      if (winnerProfile) {
        await supabase.from("profiles").update({
          battle_wins: (winnerProfile.battle_wins ?? 0) + 1,
          battle_streak: (winnerProfile.battle_streak ?? 0) >= 0 ? (winnerProfile.battle_streak ?? 0) + 1 : 1,
        }).eq("id", winnerId);
      }
      if (loserProfile) {
        await supabase.from("profiles").update({
          battle_losses: (loserProfile.battle_losses ?? 0) + 1,
          battle_streak: (loserProfile.battle_streak ?? 0) <= 0 ? (loserProfile.battle_streak ?? 0) - 1 : -1,
        }).eq("id", loserId);
      }
    }

    // Fire-and-forget push to challenger that opponent accepted
    void sendPush(battle.challenger_id, {
      title: `${opponentSummary.username} accepted your battle`,
      body: "Go see who mogged harder.",
      data: { url: `mogster://battles/reveal/${battle.id}` },
    });

    return {
      battle_id: battle.id,
      winner_id: winnerResult.winnerId,
      margin,
      narrative,
      challenger_check: challengerCheck,
      opponent_check: oppCheck,
    };
  });

  // ─── Active battles for current user ───
  app.get("/battles/active", { preHandler: requireAuth }, async (request: AuthedRequest) => {
    const userId = request.userId!;

    // Auto-expire stale battles first (cheap side-effect)
    await supabase
      .from("battles")
      .update({ status: "expired" })
      .eq("status", "awaiting_opponent")
      .lt("expires_at", new Date().toISOString());

    const { data } = await supabase
      .from("battles")
      .select(`
        id, challenger_id, opponent_id, sigma_path, expires_at, created_at,
        challenger:profiles!battles_challenger_id_fkey(id, username, battle_wins, battle_losses),
        opponent:profiles!battles_opponent_id_fkey(id, username, battle_wins, battle_losses)
      `)
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq("status", "awaiting_opponent")
      .order("created_at", { ascending: false });

    return { battles: data || [] };
  });

  // ─── Battle history ───
  app.get("/battles/history", { preHandler: requireAuth }, async (request: AuthedRequest) => {
    const userId = request.userId!;
    const { data } = await supabase
      .from("battles")
      .select(`
        id, challenger_id, opponent_id, winner_id, margin, sigma_path,
        narrative, completed_at,
        challenger:profiles!battles_challenger_id_fkey(id, username),
        opponent:profiles!battles_opponent_id_fkey(id, username)
      `)
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50);
    return { battles: data || [] };
  });

  // ─── Battle detail ───
  app.get("/battles/:battleId", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const { battleId } = request.params as { battleId: string };
    const userId = request.userId!;
    const { data: battle } = await supabase
      .from("battles")
      .select(`
        *,
        challenger:profiles!battles_challenger_id_fkey(id, username, battle_wins, battle_losses, battle_streak),
        opponent:profiles!battles_opponent_id_fkey(id, username, battle_wins, battle_losses, battle_streak),
        challenger_check:aura_checks!battles_challenger_check_id_fkey(*),
        opponent_check:aura_checks!battles_opponent_check_id_fkey(*)
      `)
      .eq("id", battleId)
      .single();
    if (!battle) return reply.status(404).send({ error: "Battle not found" });
    if (battle.challenger_id !== userId && battle.opponent_id !== userId) {
      return reply.status(403).send({ error: "Not your battle to view" });
    }
    return { battle };
  });

  // ─── Decline ───
  app.post("/battles/:battleId/decline", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const { battleId } = request.params as { battleId: string };
    const userId = request.userId!;
    const { data: battle } = await supabase.from("battles").select("opponent_id, status").eq("id", battleId).single();
    if (!battle) return reply.status(404).send({ error: "Not found" });
    if (battle.opponent_id !== userId) return reply.status(403).send({ error: "Not your battle" });
    if (battle.status !== "awaiting_opponent") return reply.status(409).send({ error: "Already resolved" });
    await supabase.from("battles").update({ status: "cancelled" }).eq("id", battleId);
    return { ok: true };
  });
}
