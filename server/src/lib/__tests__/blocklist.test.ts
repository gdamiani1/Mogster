import { describe, it, expect } from "vitest";
import { checkBlocklist } from "../blocklist";

describe("checkBlocklist()", () => {
  it("passes clean roast unchanged", () => {
    expect(checkBlocklist("your aura is mid fr, sigma grindset on cooldown").flagged).toBe(false);
  });

  it("does NOT flag brand vocabulary", () => {
    const brandRoasts = [
      "DOWN BAD detected",
      "brainrot maxxed",
      "skibidi tier achieved",
      "ohio energy off the charts",
      "mogger mode activated",
      "looksmaxxing arc complete",
      "you are mid fr",
      "absolutely cooked",
    ];
    for (const r of brandRoasts) {
      expect(checkBlocklist(r).flagged, `should not flag: "${r}"`).toBe(false);
    }
  });

  it("flags slurs (case-insensitive)", () => {
    const r = checkBlocklist("yo this RETARD energy is loud");
    expect(r.flagged).toBe(true);
    expect(r.category).toBe("slurs");
  });

  it("flags self-harm including leetspeak", () => {
    const r = checkBlocklist("just k.y.s already");
    expect(r.flagged).toBe(true);
    expect(r.category).toBe("self_harm");

    expect(checkBlocklist("kill yourself").flagged).toBe(true);
    expect(checkBlocklist("go rope").flagged).toBe(true);
  });

  it("flags body-feature shaming — nose", () => {
    const r = checkBlocklist("your nose is crooked king, get a nose job");
    expect(r.flagged).toBe(true);
    expect(r.category).toBe("body_feature");
  });

  it("flags body-feature shaming — weight", () => {
    expect(checkBlocklist("ur fat bro lose weight").flagged).toBe(true);
    expect(checkBlocklist("you're fat ngl").flagged).toBe(true);
  });

  it("flags body-feature shaming — jaw / hairline / forehead", () => {
    expect(checkBlocklist("weak jaw detected").flagged).toBe(true);
    expect(checkBlocklist("receding hairline szn").flagged).toBe(true);
    expect(checkBlocklist("fivehead alert").flagged).toBe(true);
  });

  it("flags body-feature shaming — skin / teeth", () => {
    expect(checkBlocklist("your acne is wild").flagged).toBe(true);
    expect(checkBlocklist("british teeth lol").flagged).toBe(true);
  });

  it("flags N/10 rating pattern", () => {
    const r = checkBlocklist("you look like a 4/10 bro");
    expect(r.flagged).toBe(true);
    expect(r.category).toBe("body_feature");
    expect(r.matchedTerm).toContain("N/10");
  });

  it("returns matched_term for logging", () => {
    const r = checkBlocklist("retard energy");
    expect(r.matchedTerm).toMatch(/retard/i);
  });

  it("flags sexual content", () => {
    const r = checkBlocklist("you look unfuckable bro");
    expect(r.flagged).toBe(true);
    expect(r.category).toBe("sexual");
  });
});
