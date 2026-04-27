import { PostHog } from "posthog-react-native";

// Lazy singleton — only init if env vars are set.
// In dev / test contexts without PostHog config, capture() is a no-op.
let client: PostHog | null = null;
let initialized = false;

function getClient(): PostHog | null {
  if (initialized) return client;
  initialized = true;

  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!apiKey) return null;

  try {
    client = new PostHog(apiKey, {
      host,
      flushAt: 20,
      flushInterval: 10_000, // 10s
      captureAppLifecycleEvents: false, // we capture our own app_open with semantics
    });
  } catch (e) {
    console.warn("[analytics] init failed:", e);
    client = null;
  }

  return client;
}

/**
 * Capture an event. Fire-and-forget — never throws.
 * Pre-auth events go to the anonymous distinct_id PostHog generates;
 * once identify() is called after sign-in, those get linked.
 */
export function capture(
  event: string,
  properties?: Record<string, unknown>
): void {
  try {
    const ph = getClient();
    if (!ph) return;
    // PostHog typings demand JSON-only values; our callers pass JSON-safe
    // primitives. Cast at the boundary.
    ph.capture(event, properties as Record<string, never> | undefined);
  } catch (e) {
    console.warn("[analytics] capture failed:", e);
  }
}

/**
 * Identify the user post-auth so subsequent events attach to their ID.
 */
export function identify(
  userId: string,
  properties?: Record<string, unknown>
): void {
  try {
    const ph = getClient();
    if (!ph) return;
    ph.identify(userId, properties as Record<string, never> | undefined);
  } catch (e) {
    console.warn("[analytics] identify failed:", e);
  }
}

/**
 * Reset the distinct_id on sign-out so the next user starts fresh.
 */
export function reset(): void {
  try {
    const ph = getClient();
    if (!ph) return;
    ph.reset();
  } catch (e) {
    console.warn("[analytics] reset failed:", e);
  }
}
