import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface FighterSummary {
  username: string;
  score: number;
  stats: { label: string; score: number }[];
  roast: string;
}

export interface FightNarrativeInput {
  challenger: FighterSummary;
  opponent: FighterSummary;
  sigmaPath: string;
  winnerId: string;
  margin: "UD" | "SD" | "TKO" | "DRAW" | "FORFEIT";
}

export interface FightNarrative {
  rounds: string[];
  final_line: string;
}

const SYSTEM_PROMPT = `You are an anime boxing commentator crossed with a terminally online gen alpha brainrot TikToker.
Write a 3-4 round fight narrative between two "aura battlers" in dramatic round-by-round style.
Reference the actual stats, scores, and names provided. Use gen z brainrot language heavily:
no cap, fr fr, ngl, cooked, mogging, mog differential, ohio energy, W, L, sigma, HIM, NPC, skibidi.
Do NOT be mean about appearance, body, or identity. Roast the VIBE only.
End with a devastating final one-liner about the winner.
Return ONLY valid JSON with this shape:
{"rounds": ["Round 1: ...","Round 2: ...","Round 3: ..."], "final_line": "..."}
No markdown fences, no commentary.`;

function topStats(stats: { label: string; score: number }[]): string {
  return stats
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => `${s.label} ${s.score}`)
    .join(", ");
}

export async function generateFightNarrative(
  input: FightNarrativeInput
): Promise<FightNarrative> {
  const { challenger, opponent, sigmaPath, margin, winnerId } = input;
  const winnerName =
    winnerId === "draw"
      ? "nobody (draw)"
      : winnerId === challenger.username || winnerId.endsWith(challenger.username)
      ? challenger.username
      : opponent.username;

  const userPrompt = `Path: ${sigmaPath}
Margin: ${margin}
Winner: ${winnerName}

CHALLENGER @${challenger.username}
  Score: ${challenger.score}
  Top stats: ${topStats(challenger.stats)}
  Roast: "${challenger.roast}"

OPPONENT @${opponent.username}
  Score: ${opponent.score}
  Top stats: ${topStats(opponent.stats)}
  Roast: "${opponent.roast}"

Write the fight narrative now.`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 1.1,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      // @ts-ignore
      thinkingConfig: { thinkingBudget: 0 },
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(userPrompt);
  const raw = result.response.text();
  if (!raw) throw new Error("Gemini returned empty narrative — ringside judges confused fr");

  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

  const parsed = JSON.parse(cleaned.trim());

  // Defensive validation
  if (!Array.isArray(parsed.rounds) || parsed.rounds.length < 2) {
    throw new Error("Narrative JSON malformed — rounds missing");
  }
  parsed.rounds = parsed.rounds.slice(0, 5).map((r: any) => String(r));
  parsed.final_line = String(parsed.final_line || `${winnerName} took the W.`);

  return parsed as FightNarrative;
}

export function fallbackNarrative(
  challenger: FighterSummary,
  opponent: FighterSummary,
  winnerUsername: string,
  margin: string
): FightNarrative {
  return {
    rounds: [
      `Round 1: @${challenger.username} steps in with ${challenger.score} aura. The fit is talking.`,
      `Round 2: @${opponent.username} fires back at ${opponent.score}. Mog differential is calculating...`,
      `Round 3: ${margin} lands — @${winnerUsername} takes it.`,
    ],
    final_line: `@${winnerUsername} is HIM. No cap.`,
  };
}
