import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase";
import { sendPushBatch } from "../lib/push";
import { getTodayChallenge } from "../lib/daily";

export async function cronRoutes(app: FastifyInstance) {
  app.post("/cron/daily-challenge-announce", async (req, reply) => {
    const secret = req.headers["x-cron-secret"];
    if (!secret || secret !== process.env.CRON_SHARED_SECRET) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const challenge = getTodayChallenge();
    const { data: rows, error } = await supabase
      .from("push_tokens")
      .select("user_id, expo_push_token");
    if (error) {
      app.log.error({ err: error }, "cron/daily-challenge: failed to list push_tokens");
      return reply.code(500).send({ error: "db_error" });
    }

    const title = `Today's challenge: ${challenge.title}`;
    const body = `${challenge.description} +${challenge.bonus_multiplier}× aura if you pass.`;

    const result = await sendPushBatch(rows ?? [], {
      title,
      body,
      data: { url: "mogster://" },
    });

    if (result.failed > 0) {
      app.log.warn(
        { sent: result.sent, failed: result.failed, pruned: result.invalidTokensPruned },
        "cron/daily-challenge: partial failures"
      );
    }

    return {
      ok: result.failed === 0,
      count: result.sent,
      failed: result.failed,
      pruned: result.invalidTokensPruned,
    };
  });
}
