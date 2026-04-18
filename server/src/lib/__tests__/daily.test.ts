import { describe, it, expect } from "vitest";
import { applyChallengeBonus, getTodayChallenge } from "../daily";

describe("getTodayChallenge", () => {
  it("Monday → Mogger Monday", () => {
    const monday = new Date("2026-04-20T12:00:00Z"); // a Monday
    expect(getTodayChallenge(monday).title).toBe("Mogger Monday");
  });
  it("Wednesday → Wildcard Wednesday (sigma_path null)", () => {
    const wed = new Date("2026-04-22T12:00:00Z");
    const c = getTodayChallenge(wed);
    expect(c.title).toBe("Wildcard Wednesday");
    expect(c.sigma_path).toBeNull();
  });
});

describe("applyChallengeBonus", () => {
  it("matching sigma_path applies bonus and marks completed", () => {
    const monday = new Date("2026-04-20T12:00:00Z");
    const r = applyChallengeBonus(500, "mogger_mode", monday);
    expect(r.finalScore).toBe(750);
    expect(r.multiplier).toBe(1.5);
    expect(r.challengeCompleted).toBe(true);
  });

  it("non-matching sigma_path uses multiplier 1.0", () => {
    const monday = new Date("2026-04-20T12:00:00Z");
    const r = applyChallengeBonus(500, "rizzmaxxing", monday);
    expect(r.finalScore).toBe(500);
    expect(r.multiplier).toBe(1.0);
    expect(r.challengeCompleted).toBe(false);
  });

  it("Wildcard Wednesday applies bonus regardless of sigma_path", () => {
    const wed = new Date("2026-04-22T12:00:00Z");
    const r = applyChallengeBonus(500, "brainrot_mode", wed);
    expect(r.finalScore).toBe(1000);
    expect(r.multiplier).toBe(2.0);
    expect(r.challengeCompleted).toBe(true);
  });
});
