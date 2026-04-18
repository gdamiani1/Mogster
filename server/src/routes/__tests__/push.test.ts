import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { pushRoutes } from "../push";

vi.mock("../../middleware/auth", () => ({
  requireAuth: async (req: any) => {
    req.userId = "user-1";
  },
}));

const upsertFn = vi.fn();
const deleteEq = vi.fn();
vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: upsertFn,
      delete: vi.fn(() => ({ eq: deleteEq })),
    })),
  },
}));

beforeEach(() => {
  upsertFn.mockReset();
  deleteEq.mockReset();
  upsertFn.mockResolvedValue({ error: null });
  deleteEq.mockResolvedValue({ error: null });
});

async function buildApp() {
  const app = Fastify();
  await app.register(pushRoutes);
  return app;
}

describe("push routes", () => {
  it("POST /push/register upserts a token row", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/push/register",
      payload: { expo_push_token: "ExponentPushToken[abc]", platform: "ios" },
    });
    expect(res.statusCode).toBe(200);
    expect(upsertFn).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        expo_push_token: "ExponentPushToken[abc]",
        platform: "ios",
        updated_at: expect.any(String),
      },
      { onConflict: "user_id" }
    );
  });

  it("POST /push/register rejects invalid platform", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/push/register",
      payload: { expo_push_token: "X", platform: "windows" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /push/unregister deletes the user row", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/push/unregister" });
    expect(res.statusCode).toBe(200);
    expect(deleteEq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
