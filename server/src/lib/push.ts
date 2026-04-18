import { supabase } from "./supabase";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  try {
    const { data: tokenRow } = await supabase
      .from("push_tokens")
      .select("expo_push_token, platform")
      .eq("user_id", userId)
      .maybeSingle();

    if (!tokenRow) return;

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          to: tokenRow.expo_push_token,
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
        },
      ]),
    });

    const result = await response.json().catch(() => null);
    const ticket = result?.data?.[0];
    if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered") {
      await supabase.from("push_tokens").delete().eq("user_id", userId);
    }
  } catch (err) {
    console.warn("[sendPush] failed for user", userId, err);
  }
}
