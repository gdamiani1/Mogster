import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function moderateImage(
  imageBase64: string
): Promise<{ safe: boolean; reason?: string }> {
  try {
    const response = await openai.moderations.create({
      input: [
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        },
      ],
    });

    const result = response.results[0];
    if (result.flagged) {
      return {
        safe: false,
        reason:
          "That pic is NOT it. Try again with something that doesn't violate the vibe code.",
      };
    }
    return { safe: true };
  } catch {
    // Fail open if moderation API is down
    return { safe: true };
  }
}

export function moderateOutput(text: string): boolean {
  const blocklist: string[] = [
    /* slurs and hate speech terms — populate before launch */
  ];
  const lower = text.toLowerCase();
  return !blocklist.some((term) => lower.includes(term));
}
