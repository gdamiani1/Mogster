import { ALL_BLOCKLISTS, BlocklistCategory } from "./blocklist-data";

export interface BlocklistResult {
  flagged: boolean;
  category?: BlocklistCategory;
  matchedTerm?: string;
}

const N_OUT_OF_10_PATTERN = /you look like a\s*[0-9]\s*\/\s*10/i;

export function checkBlocklist(text: string): BlocklistResult {
  const lower = text.toLowerCase();

  for (const [category, terms] of Object.entries(ALL_BLOCKLISTS) as [BlocklistCategory, readonly string[]][]) {
    for (const term of terms) {
      if (lower.includes(term.toLowerCase())) {
        return { flagged: true, category, matchedTerm: term };
      }
    }
  }

  if (N_OUT_OF_10_PATTERN.test(text)) {
    return { flagged: true, category: "body_feature", matchedTerm: "N/10 pattern" };
  }

  return { flagged: false };
}
