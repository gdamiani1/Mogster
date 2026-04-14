export const SIGMA_PATHS = [
  { id: "auramaxxing", label: "Auramaxxing", emoji: "🌀", description: "Main character energy check. Are you HIM or are you mid?" },
  { id: "looksmaxxing", label: "Looksmaxxing", emoji: "💎", description: "Softmaxx or hardmaxx, we rate the whole glow-up no cap" },
  { id: "mogger_mode", label: "Mogger Mode", emoji: "👁", description: "Are you mogging the room or getting mogged? Let's find out" },
  { id: "rizzmaxxing", label: "Rizzmaxxing", emoji: "🔥", description: "Unspoken rizz or no rizz detected? The AI knows." },
  { id: "statusmaxxing", label: "Statusmaxxing", emoji: "💸", description: "How hard are you flexing rn? Drip check activated" },
  { id: "brainrot_mode", label: "Brainrot Mode", emoji: "💀", description: "Full goblin mode. Ohio energy. Skibidi toilet arc. No thoughts." },
  { id: "sigma_grindset", label: "Sigma Grindset", emoji: "⚡", description: "Are you on your sigma grindset or are you just an NPC?" },
] as const;

export type SigmaPathId = typeof SIGMA_PATHS[number]["id"];
