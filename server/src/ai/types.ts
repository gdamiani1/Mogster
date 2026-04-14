export type SigmaPath =
  | "auramaxxing"
  | "looksmaxxing"
  | "mogger_mode"
  | "rizzmaxxing"
  | "statusmaxxing"
  | "brainrot_mode"
  | "sigma_grindset";

export interface AuraStat {
  label: string;
  score: number; // 0-100
}

export interface AuraResult {
  aura_score: number;
  personality_read: string;
  roast: string;
  aura_color: {
    primary: string;
    secondary: string;
    gradient_angle: number;
  };
  tier: string;
  stats: AuraStat[];
}

export const SIGMA_PATHS: Record<SigmaPath, { label: string; description: string }> = {
  auramaxxing: {
    label: "Auramaxxing",
    description: "Main character energy check. Are you HIM or are you mid?",
  },
  looksmaxxing: {
    label: "Looksmaxxing",
    description: "Softmaxx or hardmaxx, we rate the whole glow-up no cap",
  },
  mogger_mode: {
    label: "Mogger Mode",
    description: "Are you mogging the room or getting mogged? Let's find out",
  },
  rizzmaxxing: {
    label: "Rizzmaxxing",
    description: "Unspoken rizz or no rizz detected? The AI knows.",
  },
  statusmaxxing: {
    label: "Statusmaxxing",
    description: "How hard are you flexing rn? Drip check activated",
  },
  brainrot_mode: {
    label: "Brainrot Mode",
    description: "Full goblin mode. Ohio energy. Skibidi toilet arc. No thoughts.",
  },
  sigma_grindset: {
    label: "Sigma Grindset",
    description: "Are you on your sigma grindset or are you just an NPC?",
  },
};
