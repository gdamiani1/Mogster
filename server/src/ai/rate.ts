import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { buildPrompt } from "./prompts";
import { AuraResult, SigmaPath } from "./types";
import { ModerationBlockError } from "./errors";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export async function rateAura(
  imageBase64: string,
  path: SigmaPath,
  opts: { strict?: boolean } = {}
): Promise<AuraResult> {
  const systemPrompt = buildPrompt(path, opts.strict ?? false);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 1.2,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      // @ts-ignore - disable thinking to avoid token budget issues
      thinkingConfig: { thinkingBudget: 0 },
    },
    systemInstruction: systemPrompt,
    safetySettings: SAFETY_SETTINGS,
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64,
      },
    },
    { text: "Rate this person's aura. Return ONLY the JSON." },
  ]);

  const candidate = result.response.candidates?.[0];

  // SAFETY block: don't call .text() — it throws when the response was blocked.
  if (candidate?.finishReason === "SAFETY") {
    throw new ModerationBlockError(candidate.safetyRatings, "image_input");
  }

  const raw = result.response.text();
  if (!raw) throw new Error("AI returned empty response — aura too powerful to compute fr");

  // Clean up response — strip markdown fences if Gemini wraps JSON
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const parsed: AuraResult = JSON.parse(cleaned);

  // Add variance — Gemini loves rounding to multiples of 10, so inject ±30-70 randomness
  const jitter = Math.floor(Math.random() * 81) - 40; // -40 to +40
  const oddOffset = [3, 7, 13, 17, 23, 27, 33, 37][Math.floor(Math.random() * 8)]; // avoid round numbers
  parsed.aura_score = parsed.aura_score + jitter + (Math.random() > 0.5 ? oddOffset : -oddOffset);

  // Clamp to valid range
  parsed.aura_score = Math.max(0, Math.min(1000, parsed.aura_score));

  // Recalculate tier based on final score
  if (parsed.aura_score >= 1000) parsed.tier = "Skibidi Legendary";
  else if (parsed.aura_score >= 950) parsed.tier = "Mog God";
  else if (parsed.aura_score >= 900) parsed.tier = "Sigma";
  else if (parsed.aura_score >= 800) parsed.tier = "HIM / HER";
  else if (parsed.aura_score >= 600) parsed.tier = "Cooking";
  else if (parsed.aura_score >= 400) parsed.tier = "6-7";
  else if (parsed.aura_score >= 200) parsed.tier = "NPC";
  else parsed.tier = "Down Bad";

  // Validate stats — clamp each to 0-100 and ensure it's an array of 5
  if (!Array.isArray(parsed.stats)) parsed.stats = [];
  parsed.stats = parsed.stats.slice(0, 5).map((s: any) => ({
    label: String(s.label || "Stat"),
    score: Math.max(0, Math.min(100, Math.round(Number(s.score) || 0))),
  }));

  // Normalize stats so their average matches the final aura_score / 10.
  // This preserves the AI's relative rankings (which stat is highest/lowest)
  // while guaranteeing the math adds up after jitter.
  if (parsed.stats.length > 0) {
    const targetAvg = parsed.aura_score / 10; // 0-100 scale
    const currentAvg =
      parsed.stats.reduce((sum, s) => sum + s.score, 0) / parsed.stats.length;
    const delta = targetAvg - currentAvg;

    // Shift + slight preservation of variance
    parsed.stats = parsed.stats.map((s) => {
      const shifted = s.score + delta;
      // Add ±3 noise so stats don't look too uniform after shifting
      const noise = Math.floor(Math.random() * 7) - 3;
      return {
        label: s.label,
        score: Math.max(0, Math.min(100, Math.round(shifted + noise))),
      };
    });
  }

  return parsed;
}
