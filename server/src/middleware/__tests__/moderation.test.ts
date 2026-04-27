import { describe, it, expect, vi, beforeEach } from "vitest";

const redisMock = { incr: vi.fn(), expire: vi.fn() };
const supabaseMock = { from: vi.fn() };
const getStrikeStatusMock = vi.fn();

vi.mock("../../lib/redis", () => ({ redis: redisMock, LEADERBOARD_KEYS: {} }));
vi.mock("../../lib/supabase", () => ({ supabase: supabaseMock }));
vi.mock("../../lib/strikes", () => ({ getStrikeStatus: getStrikeStatusMock }));

beforeEach(() => {
  redisMock.incr.mockReset();
  redisMock.expire.mockReset();
  supabaseMock.from.mockReset();
  getStrikeStatusMock.mockReset();
  // default: insert log succeeds
  supabaseMock.from.mockReturnValue({ insert: async () => ({ error: null }) });
  // default: 0 strikes
  getStrikeStatusMock.mockResolvedValue({ locked: "none", recentRejects24h: 0, recentRejects7d: 0 });
  // default: not at circuit breaker
  redisMock.incr.mockResolvedValue(100);
});

describe("preCheck() — strikes + circuit breaker", () => {
  it("allows when no strikes and budget OK", async () => {
    const { preCheck } = await import("../moderation");
    const r = await preCheck({ userId: "u1" });
    expect(r.allow).toBe(true);
  });

  it("hard-locks when strike status is hard", async () => {
    getStrikeStatusMock.mockResolvedValue({ locked: "hard", recentRejects24h: 5, recentRejects7d: 5 });
    const { preCheck } = await import("../moderation");
    const r = await preCheck({ userId: "u1" });
    expect(r.allow).toBe(false);
    expect(r.hardLocked).toBe(true);
    expect(r.copyTier).toBe("C");
  });

  it("trips circuit breaker over 5000 calls/day", async () => {
    redisMock.incr.mockResolvedValue(5001);
    const { preCheck } = await import("../moderation");
    const r = await preCheck({ userId: "u1" });
    expect(r.allow).toBe(false);
    expect(r.eventType).toBe("system_busy");
  });

  it("logs system_busy when circuit breaker trips", async () => {
    redisMock.incr.mockResolvedValue(5001);
    const insertSpy = vi.fn(async () => ({ error: null }));
    supabaseMock.from.mockReturnValue({ insert: insertSpy });
    const { preCheck } = await import("../moderation");
    await preCheck({ userId: "u1" });
    expect(insertSpy).toHaveBeenCalled();
  });
});

describe("handleSafetyBlock() — converts ModerationBlockError to ModerationResult", () => {
  it("returns copy_tier=A on first reject", async () => {
    getStrikeStatusMock.mockResolvedValue({ locked: "none", recentRejects24h: 0, recentRejects7d: 0 });
    const { handleSafetyBlock } = await import("../moderation");
    const { ModerationBlockError } = await import("../../ai/errors");
    const err = new ModerationBlockError([{ category: "SEXUAL", probability: "HIGH" }], "image_input");
    const r = await handleSafetyBlock(err, { userId: "u1", imageBuffer: Buffer.from("x") });
    expect(r.allow).toBe(false);
    expect(r.copyTier).toBe("A");
    expect(r.retryAllowed).toBe(true);
  });

  it("returns copy_tier=B on 2nd reject", async () => {
    getStrikeStatusMock.mockResolvedValue({ locked: "none", recentRejects24h: 1, recentRejects7d: 1 });
    const { handleSafetyBlock } = await import("../moderation");
    const { ModerationBlockError } = await import("../../ai/errors");
    const err = new ModerationBlockError([], "image_input");
    const r = await handleSafetyBlock(err, { userId: "u1", imageBuffer: Buffer.from("x") });
    expect(r.copyTier).toBe("B");
  });

  it("returns copy_tier=C and softLock at 3rd in 24h", async () => {
    getStrikeStatusMock.mockResolvedValue({ locked: "soft", recentRejects24h: 2, recentRejects7d: 2 });
    const { handleSafetyBlock } = await import("../moderation");
    const { ModerationBlockError } = await import("../../ai/errors");
    const err = new ModerationBlockError([], "image_input");
    const r = await handleSafetyBlock(err, { userId: "u1", imageBuffer: Buffer.from("x") });
    expect(r.copyTier).toBe("C");
    expect(r.softLockedUntil).toBeInstanceOf(Date);
    expect(r.retryAllowed).toBe(false);
  });

  it("logs moderation_event on every reject", async () => {
    const insertSpy = vi.fn(async () => ({ error: null }));
    supabaseMock.from.mockReturnValue({ insert: insertSpy });
    const { handleSafetyBlock } = await import("../moderation");
    const { ModerationBlockError } = await import("../../ai/errors");
    const err = new ModerationBlockError([], "image_input");
    await handleSafetyBlock(err, { userId: "u1", imageBuffer: Buffer.from("x") });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "gemini_safety",
        severity: "reject",
        user_id: "u1",
      })
    );
  });

  it("hashes the image buffer with sha256", async () => {
    const insertSpy = vi.fn(async () => ({ error: null }));
    supabaseMock.from.mockReturnValue({ insert: insertSpy });
    const { handleSafetyBlock } = await import("../moderation");
    const { ModerationBlockError } = await import("../../ai/errors");
    const err = new ModerationBlockError([], "image_input");
    await handleSafetyBlock(err, { userId: "u1", imageBuffer: Buffer.from("test") });
    const calls = insertSpy.mock.calls as unknown as Array<[{ image_sha256?: string }]>;
    expect(calls[0][0].image_sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("moderateOutput()", () => {
  it("returns clean roast unflagged", async () => {
    const { moderateOutput } = await import("../moderation");
    expect(moderateOutput("your aura is mid fr").flagged).toBe(false);
  });

  it("flags body-feature shame", async () => {
    const { moderateOutput } = await import("../moderation");
    const r = moderateOutput("your nose is crooked, get a nose job");
    expect(r.flagged).toBe(true);
    expect(r.category).toBe("body_feature");
  });
});
