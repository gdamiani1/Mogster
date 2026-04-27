import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test";
  vi.resetModules();
});

describe("rateAura()", () => {
  it("throws ModerationBlockError when finishReason is SAFETY", async () => {
    vi.doMock("@google/generative-ai", () => ({
      HarmCategory: {
        HARM_CATEGORY_SEXUALLY_EXPLICIT: "SEXUAL",
        HARM_CATEGORY_DANGEROUS_CONTENT: "DANGER",
        HARM_CATEGORY_HARASSMENT: "HARASS",
        HARM_CATEGORY_HATE_SPEECH: "HATE",
      },
      HarmBlockThreshold: { BLOCK_MEDIUM_AND_ABOVE: "MEDIUM" },
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: async () => ({
              response: {
                candidates: [
                  {
                    finishReason: "SAFETY",
                    safetyRatings: [{ category: "SEXUAL", probability: "HIGH" }],
                  },
                ],
                text: () => {
                  throw new Error("no text");
                },
              },
            }),
          };
        }
      },
    }));

    const { rateAura } = await import("../rate");
    const { ModerationBlockError } = await import("../errors");

    await expect(rateAura("base64data", "rizzmaxxing")).rejects.toBeInstanceOf(
      ModerationBlockError
    );
  });

  it("returns parsed AuraResult on STOP finishReason", async () => {
    vi.doMock("@google/generative-ai", () => ({
      HarmCategory: {
        HARM_CATEGORY_SEXUALLY_EXPLICIT: "SEXUAL",
        HARM_CATEGORY_DANGEROUS_CONTENT: "DANGER",
        HARM_CATEGORY_HARASSMENT: "HARASS",
        HARM_CATEGORY_HATE_SPEECH: "HATE",
      },
      HarmBlockThreshold: { BLOCK_MEDIUM_AND_ABOVE: "MEDIUM" },
      GoogleGenerativeAI: class {
        getGenerativeModel() {
          return {
            generateContent: async () => ({
              response: {
                candidates: [{ finishReason: "STOP" }],
                text: () =>
                  JSON.stringify({
                    aura_score: 720,
                    personality_read: "menace energy",
                    roast: "your aura is mid",
                    aura_color: { primary: "#FFD60A", secondary: "#0A0A0A", gradient_angle: 45 },
                    tier: "Cooking",
                    stats: [
                      { label: "Drip", score: 70 },
                      { label: "Pose", score: 75 },
                      { label: "Setting", score: 68 },
                      { label: "Energy", score: 72 },
                      { label: "Expression", score: 71 },
                    ],
                  }),
              },
            }),
          };
        }
      },
    }));

    const { rateAura } = await import("../rate");
    const result = await rateAura("base64data", "rizzmaxxing");
    expect(result.aura_score).toBeGreaterThan(0);
    expect(result.aura_score).toBeLessThanOrEqual(1000);
    expect(result.roast).toBe("your aura is mid");
    expect(result.stats.length).toBe(5);
  });

  it("passes safetySettings to getGenerativeModel", async () => {
    const getGenerativeModelSpy = vi.fn().mockReturnValue({
      generateContent: async () => ({
        response: {
          candidates: [{ finishReason: "STOP" }],
          text: () =>
            JSON.stringify({
              aura_score: 500,
              personality_read: "x",
              roast: "y",
              aura_color: { primary: "#000", secondary: "#fff", gradient_angle: 0 },
              tier: "6-7",
              stats: [{ label: "X", score: 50 }],
            }),
        },
      }),
    });

    vi.doMock("@google/generative-ai", () => ({
      HarmCategory: {
        HARM_CATEGORY_SEXUALLY_EXPLICIT: "SEXUAL",
        HARM_CATEGORY_DANGEROUS_CONTENT: "DANGER",
        HARM_CATEGORY_HARASSMENT: "HARASS",
        HARM_CATEGORY_HATE_SPEECH: "HATE",
      },
      HarmBlockThreshold: { BLOCK_MEDIUM_AND_ABOVE: "MEDIUM" },
      GoogleGenerativeAI: class {
        getGenerativeModel = getGenerativeModelSpy;
      },
    }));

    const { rateAura } = await import("../rate");
    await rateAura("base64data", "rizzmaxxing");

    expect(getGenerativeModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        safetySettings: expect.arrayContaining([
          expect.objectContaining({ category: "SEXUAL", threshold: "MEDIUM" }),
        ]),
      })
    );
  });
});
