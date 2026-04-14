import { describe, it, expect, vi } from "vitest";

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                rounds: [
                  "Round 1: gdamiani steps up, Outfit 82 is cooking no cap",
                  "Round 2: maya fires back with 91 Charm fr",
                  "Round 3: gdamiani lands the finishing blow, 847 vs 712",
                ],
                final_line: "gdamiani is HIM. maya crashed out.",
              }),
          },
        }),
      }),
    })),
  };
});

import { generateFightNarrative } from "../battle";

describe("generateFightNarrative", () => {
  it("returns rounds array and final_line", async () => {
    process.env.GEMINI_API_KEY = "test";
    const result = await generateFightNarrative({
      challenger: { username: "gdamiani", score: 847, stats: [{ label: "Outfit", score: 82 }], roast: "cooking" },
      opponent:   { username: "maya",     score: 712, stats: [{ label: "Charm",  score: 91 }], roast: "trying" },
      sigmaPath: "auramaxxing",
      winnerId: "u1",
      margin: "UD",
    });
    expect(Array.isArray(result.rounds)).toBe(true);
    expect(result.rounds.length).toBeGreaterThanOrEqual(3);
    expect(typeof result.final_line).toBe("string");
    expect(result.final_line.length).toBeGreaterThan(0);
  });
});
