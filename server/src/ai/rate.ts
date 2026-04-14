import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildPrompt } from "./prompts";
import { AuraResult, SigmaPath } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function rateAura(
  imageBase64: string,
  path: SigmaPath
): Promise<AuraResult> {
  const systemPrompt = buildPrompt(path);

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

  return parsed;
}
