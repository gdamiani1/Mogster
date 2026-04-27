export class ModerationBlockError extends Error {
  constructor(
    public readonly safetyRatings: unknown,
    public readonly stage: "image_input" | "text_output"
  ) {
    super("MODERATION_BLOCK");
    this.name = "ModerationBlockError";
  }
}
