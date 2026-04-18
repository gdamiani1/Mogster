import { FastifyInstance } from "fastify";
import { supabase } from "../lib/supabase";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { sendPush } from "../lib/push";

export async function friendRoutes(app: FastifyInstance) {
  // Link Up — send friend request
  app.post("/circle/link", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const { addressee_username } = request.body as { addressee_username: string };
    const requester_id = request.userId!;

    const { data: addressee } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", addressee_username)
      .single();
    if (!addressee) {
      return reply.status(404).send({ error: "User not found. That username doesn't exist fr" });
    }

    if (addressee.id === requester_id) {
      return reply.status(400).send({ error: "Can't link up with yourself bro" });
    }

    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id, addressee_id: addressee.id });
    if (error) {
      return reply.status(400).send({ error: "Already in your circle or request pending" });
    }

    // Fire-and-forget push to addressee
    const { data: requester } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", requester_id)
      .single();
    void sendPush(addressee.id, {
      title: `${requester?.username ?? "Someone"} wants to join your circle`,
      body: "Accept or decline in Battles.",
      data: { url: "mogster://battles" },
    });

    return { message: "Link up request sent. W." };
  });

  // Accept / reject
  app.patch("/circle/respond", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const { friendship_id, action } = request.body as {
      friendship_id: string;
      action: "accepted" | "blocked";
    };

    // Only allow the addressee to respond
    const { data: friendship } = await supabase
      .from("friendships")
      .select("addressee_id")
      .eq("id", friendship_id)
      .single();

    if (!friendship || friendship.addressee_id !== request.userId) {
      return reply.status(403).send({ error: "That ain't your friend request." });
    }

    const { error } = await supabase
      .from("friendships")
      .update({ status: action })
      .eq("id", friendship_id);
    if (error) return reply.status(400).send({ error: "Failed to update. Try again." });

    return {
      message:
        action === "accepted"
          ? "Linked up. W secured."
          : "Blocked. They can't see your aura anymore.",
    };
  });

  // Get your circle
  app.get("/circle/:userId", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const { userId } = request.params as { userId: string };
    if (userId !== request.userId) {
      return reply.status(403).send({ error: "That ain't your circle." });
    }

    const { data } = await supabase
      .from("friendships")
      .select(
        "id, status, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url, peak_aura, tier), addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url, peak_aura, tier)"
      )
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq("status", "accepted");

    const friends = (data || []).map((f: any) => {
      const friend = f.requester.id === userId ? f.addressee : f.requester;
      return { friendship_id: f.id, ...friend };
    });
    return { circle: friends };
  });

  // Pending requests
  app.get("/circle/pending/:userId", { preHandler: requireAuth }, async (request: AuthedRequest, reply) => {
    const { userId } = request.params as { userId: string };
    if (userId !== request.userId) {
      return reply.status(403).send({ error: "That ain't your pending list." });
    }

    const { data } = await supabase
      .from("friendships")
      .select(
        "id, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url)"
      )
      .eq("addressee_id", userId)
      .eq("status", "pending");
    return { pending: data || [] };
  });
}
