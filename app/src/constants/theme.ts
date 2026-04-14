// Mogster design system v0.1 — Brutalist Editorial × Ring-walk
// See docs/design/mogster-redesign.html for the full spec.

export const COLORS = {
  // Ground
  bg: "#0A0A0A",        // INK — primary background
  bgCard: "#14140F",    // INK 2 — cards, elevated surfaces
  bgElevated: "#1A1A12", // slightly lifted

  // Signature
  primary: "#FFD60A",   // HAZARD YELLOW — the brand color. Use sparingly.

  // Semantics
  mint: "#7FFFA1",      // HIGH — high scores, wins
  blood: "#FF3B30",     // LOSS — losses, errors
  success: "#7FFFA1",   // alias of mint
  danger: "#FF3B30",    // alias of blood
  warning: "#FFD60A",   // alias of primary

  // Text
  textPrimary: "#F5F1E6",   // PAPER — never pure white
  textSecondary: "#A8A89B", // muted paper
  textMuted: "#6B6B5E",     // GHOST — metadata, captions

  // Lines + borders
  border: "#252520",
  borderAccent: "rgba(255, 214, 10, 0.25)", // hazard at 25%

  // Legacy aliases (do not use in new code, kept for migration)
  secondary: "#FFD60A",
  accent: "#7FFFA1",
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  card: 0, // editorial cards have sharp corners
};

export const FONTS = {
  display: "Anton_400Regular",              // display face — scores, tiers, headlines
  stencil: "Bungee_400Regular",             // accents — stamps, titles
  mono: "JetBrainsMono_400Regular",         // body + data
  monoBold: "JetBrainsMono_700Bold",        // emphasized mono
};

// SVG noise data URI for React Native backgrounds
export const GRAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="0.5"/></svg>`;
