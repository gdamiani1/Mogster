import { PostHog } from "posthog-node";

// Lazy singleton — only init if env vars are set. In tests / local without
// PostHog config, capture() is a no-op so nothing breaks.
let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;
  const key = process.env.POSTHOG_KEY;
  const host = process.env.POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!key) return null;
  client = new PostHog(key, {
    host,
    flushAt: 20,         // batch up to 20 events
    flushInterval: 5000, // or every 5s
  });
  return client;
}

interface CaptureParams {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}

/**
 * Capture an event to PostHog. Fire-and-forget — never throws, never blocks.
 * Use the user's UUID for `distinctId` when authed, or 'anonymous' / IP-based
 * for guest contexts.
 */
export function capture(params: CaptureParams): void {
  const ph = getClient();
  if (!ph) return;
  try {
    ph.capture({
      distinctId: params.distinctId,
      event: params.event,
      properties: params.properties,
    });
  } catch (e) {
    console.warn("[analytics] capture failed:", e);
  }
}

/**
 * Flush pending events. Call from server shutdown / graceful exit hooks
 * if you want to guarantee delivery before the process dies.
 */
export async function flush(): Promise<void> {
  const ph = getClient();
  if (!ph) return;
  try {
    await ph.shutdown();
  } catch {
    // swallow
  }
}
