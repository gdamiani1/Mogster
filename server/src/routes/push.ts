import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthedRequest } from "../middleware/auth";

interface RegisterBody {
  expo_push_token: string;
  platform: "ios" | "android";
}

export async function pushRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>(
    "/push/register",
    {
      preHandler: requireAuth,
      schema: {
        body: {
          type: "object",
          required: ["expo_push_token", "platform"],
          properties: {
            expo_push_token: { type: "string", minLength: 1 },
            platform: { type: "string", enum: ["ios", "android"] },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = (request as AuthedRequest).userId!;
      const { expo_push_token, platform } = request.body;
      const { error } = await supabase.from("push_tokens").upsert(
        {
          user_id: userId,
          expo_push_token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) return reply.status(500).send({ error: error.message });
      return { ok: true };
    }
  );

  app.post(
    "/push/unregister",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as AuthedRequest).userId!;
      const { error } = await supabase.from("push_tokens").delete().eq("user_id", userId);
      if (error) return reply.status(500).send({ error: error.message });
      return { ok: true };
    }
  );
}
