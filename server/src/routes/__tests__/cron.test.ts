import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { cronRoutes } from "../cron";

vi.mock("../../lib/push", () => ({
  sendPushBatch: vi.fn().mockResolvedValue({ sent: 2, failed: 0, invalidTokensPruned: 0 }),
}));
vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [
          { user_id: "u1", expo_push_token: "tok1" },
          { user_id: "u2", expo_push_token: "tok2" },
        ],
        error: null,
      }),
    })),
  },
}));

const SECRET = "test-secret";
process.env.CRON_SHARED_SECRET = SECRET;

async function buildApp() {
  const app = Fastify();
  await app.register(cronRoutes);
  return app;
}

beforeEach(() => vi.clearAllMocks());

describe("POST /cron/daily-challenge-announce", () => {
  it("rejects without shared secret header", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/cron/daily-challenge-announce" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects with wrong shared secret", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/cron/daily-challenge-announce",
      headers: { "x-cron-secret": "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("batches a push to every token and reports counts", async () => {
    const { sendPushBatch } = await import("../../lib/push");
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/cron/daily-challenge-announce",
      headers: { "x-cron-secret": SECRET },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual({ ok: true, count: 2, failed: 0, pruned: 0 });
    expect(sendPushBatch).toHaveBeenCalledTimes(1);
    expect(sendPushBatch).toHaveBeenCalledWith(
      [
        { user_id: "u1", expo_push_token: "tok1" },
        { user_id: "u2", expo_push_token: "tok2" },
      ],
      expect.objectContaining({
        data: { url: "mogster://" },
      })
    );
  });

  it("surfaces partial failures in the response", async () => {
    const { sendPushBatch } = await import("../../lib/push");
    (sendPushBatch as any).mockResolvedValueOnce({ sent: 1, failed: 1, invalidTokensPruned: 1 });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/cron/daily-challenge-announce",
      headers: { "x-cron-secret": SECRET },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual({ ok: false, count: 1, failed: 1, pruned: 1 });
  });
});
