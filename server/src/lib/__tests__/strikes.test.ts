import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };
vi.mock("../supabase", () => ({ supabase: supabaseMock }));

beforeEach(() => {
  supabaseMock.from.mockReset();
});

function mockReturn(rows: any[]) {
  supabaseMock.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        gte: () => ({
          in: async () => ({ data: rows, error: null }),
        }),
      }),
    }),
  });
}

describe("getStrikeStatus()", () => {
  it("returns ok when 0 rejects in window", async () => {
    mockReturn([]);
    const { getStrikeStatus } = await import("../strikes");
    const status = await getStrikeStatus({ userId: "u1" });
    expect(status.locked).toBe("none");
    expect(status.recentRejects24h).toBe(0);
    expect(status.recentRejects7d).toBe(0);
  });

  it("does not soft-lock at 2 rejects in 24h", async () => {
    const now = Date.now();
    mockReturn([
      { created_at: new Date(now - 1000 * 60 * 60).toISOString() },
      { created_at: new Date(now - 1000 * 60 * 30).toISOString() },
    ]);
    const { getStrikeStatus } = await import("../strikes");
    const status = await getStrikeStatus({ userId: "u1" });
    expect(status.locked).toBe("none");
    expect(status.recentRejects24h).toBe(2);
  });

  it("soft-locks at 3 rejects in 24h", async () => {
    const now = Date.now();
    mockReturn([
      { created_at: new Date(now - 1000 * 60 * 60).toISOString() },
      { created_at: new Date(now - 1000 * 60 * 30).toISOString() },
      { created_at: new Date(now - 1000 * 60 * 10).toISOString() },
    ]);
    const { getStrikeStatus } = await import("../strikes");
    const status = await getStrikeStatus({ userId: "u1" });
    expect(status.locked).toBe("soft");
    expect(status.recentRejects24h).toBe(3);
    expect(status.lockedUntil).toBeInstanceOf(Date);
  });

  it("hard-locks at 5 rejects in 7d", async () => {
    const now = Date.now();
    const rows = Array.from({ length: 5 }, (_, i) => ({
      created_at: new Date(now - 1000 * 60 * 60 * 24 * (i + 1)).toISOString(),
    }));
    mockReturn(rows);
    const { getStrikeStatus } = await import("../strikes");
    const status = await getStrikeStatus({ userId: "u1" });
    expect(status.locked).toBe("hard");
    expect(status.recentRejects7d).toBe(5);
  });

  it("returns none when no userId or ipAddress provided", async () => {
    const { getStrikeStatus } = await import("../strikes");
    const status = await getStrikeStatus({});
    expect(status.locked).toBe("none");
  });

  it("queries by ip_address when only ipAddress given", async () => {
    const eqSpy = vi.fn().mockReturnValue({ gte: () => ({ in: async () => ({ data: [], error: null }) }) });
    supabaseMock.from.mockReturnValue({ select: () => ({ eq: eqSpy }) });
    const { getStrikeStatus } = await import("../strikes");
    await getStrikeStatus({ ipAddress: "1.2.3.4" });
    expect(eqSpy).toHaveBeenCalledWith("ip_address", "1.2.3.4");
  });

  it("returns none on supabase error", async () => {
    supabaseMock.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          gte: () => ({ in: async () => ({ data: null, error: new Error("db down") }) }),
        }),
      }),
    });
    const { getStrikeStatus } = await import("../strikes");
    const status = await getStrikeStatus({ userId: "u1" });
    expect(status.locked).toBe("none");
  });
});
