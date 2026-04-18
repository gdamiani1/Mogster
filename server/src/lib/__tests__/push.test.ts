import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendPush } from "../push";

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
