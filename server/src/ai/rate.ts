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

  // Clamp score to valid range
  parsed.aura_score = Math.max(0, Math.min(1000, Math.round(parsed.aura_score)));

  return parsed;
}
