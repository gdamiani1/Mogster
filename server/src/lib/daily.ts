export const ROTATING_CHALLENGES = [
  {
    title: "Mogger Monday",
    description: "Show the world you're mogging. Mogger Mode only.",
    sigma_path: "mogger_mode",
    bonus_multiplier: 1.5,
  },
  {
    title: "Transformation Tuesday",
    description: "Glow-up check. Best looksmaxxing pic wins.",
    sigma_path: "looksmaxxing",
    bonus_multiplier: 1.5,
  },
  {
    title: "Wildcard Wednesday",
    description: "Any path. Any vibe. Just cook.",
    sigma_path: null,
    bonus_multiplier: 2.0,
  },
  {
    title: "Rizz Thursday",
    description: "Main character energy only. Show your rizz.",
    sigma_path: "rizzmaxxing",
    bonus_multiplier: 1.5,
  },
  {
    title: "Flex Friday",
    description: "Statusmaxxing activated. Show the drip.",
    sigma_path: "statusmaxxing",
    bonus_multiplier: 1.5,
  },
  {
    title: "Sigma Saturday",
    description: "Grindset check. Are you on your sigma arc?",
    sigma_path: "sigma_grindset",
    bonus_multiplier: 1.5,
  },
  {
    title: "Brainrot Sunday",
    description: "Full chaos. Ohio energy. Most unhinged pic wins.",
    sigma_path: "brainrot_mode",
    bonus_multiplier: 2.0,
  },
] as const;

export function getTodayChallenge(now: Date = new Date()) {
  const dayMap = [6, 0, 1, 2, 3, 4, 5]; // Sun->6, Mon->0, etc.
  return ROTATING_CHALLENGES[dayMap[now.getDay()]];
}

export interface BonusResult {
  finalScore: number;
  multiplier: number;
  challengeCompleted: boolean;
}

export function applyChallengeBonus(
  baseScore: number,
  submittedSigmaPath: string,
  now: Date = new Date()
): BonusResult {
  const today = getTodayChallenge(now);
  const matches = today.sigma_path === null || today.sigma_path === submittedSigmaPath;
  const multiplier = matches ? today.bonus_multiplier : 1.0;
  return {
    finalScore: Math.round(baseScore * multiplier),
    multiplier,
    challengeCompleted: matches,
  };
}
