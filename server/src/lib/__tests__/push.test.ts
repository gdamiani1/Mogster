import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendPush, sendPushBatch } from "../push";

vi.mock("../supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
});

describe("sendPush", () => {
  it("POSTs to Expo Push API with the user token, title, body, data", async () => {
    const { supabase } = await import("../supabase");
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { expo_push_token: "ExponentPushToken[abc]", platform: "ios" },
        error: null,
      }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ status: "ok" }] }),
    });

    await sendPush("user-1", { title: "T", body: "B", data: { url: "mogster://x" } });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://exp.host/--/api/v2/push/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify([
          { to: "ExponentPushToken[abc]", title: "T", body: "B", data: { url: "mogster://x" } },
        ]),
      })
    );
  });

  it("no-ops silently if the user has no push token row", async () => {
    const { supabase } = await import("../supabase");
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    await sendPush("user-no-token", { title: "T", body: "B" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes the token row when Expo returns DeviceNotRegistered", async () => {
    const { supabase } = await import("../supabase");
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEq });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { expo_push_token: "ExponentPushToken[stale]", platform: "ios" },
        error: null,
      }),
      delete: deleteMock,
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ status: "error", details: { error: "DeviceNotRegistered" } }],
        }),
    });

    await sendPush("user-stale", { title: "T", body: "B" });

    expect(deleteMock).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith("user_id", "user-stale");
  });

  it("does not throw when fetch rejects (fire-and-forget)", async () => {
    const { supabase } = await import("../supabase");
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { expo_push_token: "ExponentPushToken[x]", platform: "ios" },
        error: null,
      }),
    });
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await expect(sendPush("u", { title: "t", body: "b" })).resolves.toBeUndefined();
  });
});

describe("sendPushBatch", () => {
  it("POSTs all tokens in a single chunk and counts OK tickets", async () => {
    const { supabase } = await import("../supabase");
    (supabase.from as any).mockReturnValue({ delete: vi.fn() });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ status: "ok" }, { status: "ok" }],
        }),
    });

    const result = await sendPushBatch(
      [
        { user_id: "u1", expo_push_token: "t1" },
        { user_id: "u2", expo_push_token: "t2" },
      ],
      { title: "T", body: "B", data: { url: "mogster://" } }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ sent: 2, failed: 0, invalidTokensPruned: 0 });
  });

  it("splits >100 tokens across multiple POSTs", async () => {
    const { supabase } = await import("../supabase");
    (supabase.from as any).mockReturnValue({ delete: vi.fn() });
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: Array.from({ length: 100 }, () => ({ status: "ok" })),
        }),
    });
    const rows = Array.from({ length: 150 }, (_, i) => ({
      user_id: `u${i}`,
      expo_push_token: `tok${i}`,
    }));

    const result = await sendPushBatch(rows, { title: "T", body: "B" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.sent).toBeGreaterThan(0);
  });

  it("prunes DeviceNotRegistered tokens and counts failures", async () => {
    const { supabase } = await import("../supabase");
    const deleteIn = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ in: deleteIn });
    (supabase.from as any).mockReturnValue({ delete: deleteMock });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            { status: "ok" },
            { status: "error", details: { error: "DeviceNotRegistered" } },
          ],
        }),
    });

    const result = await sendPushBatch(
      [
        { user_id: "u1", expo_push_token: "t1" },
        { user_id: "u2", expo_push_token: "stale" },
      ],
      { title: "T", body: "B" }
    );

    expect(result).toEqual({ sent: 1, failed: 1, invalidTokensPruned: 1 });
    expect(deleteIn).toHaveBeenCalledWith("user_id", ["u2"]);
  });

  it("marks whole chunk as failed when fetch throws", async () => {
    const { supabase } = await import("../supabase");
    (supabase.from as any).mockReturnValue({ delete: vi.fn() });
    fetchMock.mockRejectedValueOnce(new Error("down"));

    const result = await sendPushBatch(
      [
        { user_id: "u1", expo_push_token: "t1" },
        { user_id: "u2", expo_push_token: "t2" },
      ],
      { title: "T", body: "B" }
    );

    expect(result).toEqual({ sent: 0, failed: 2, invalidTokensPruned: 0 });
  });
});
