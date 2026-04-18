import { supabase } from "./supabase";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface TokenRow {
  user_id: string;
  expo_push_token: string;
}

export interface BatchResult {
  sent: number;
  failed: number;
  invalidTokensPruned: number;
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

export async function sendPushBatch(
  rows: TokenRow[],
  payload: PushPayload
): Promise<BatchResult> {
  let sent = 0;
  let failed = 0;
  let invalidTokensPruned = 0;

  for (let i = 0; i < rows.length; i += EXPO_BATCH_SIZE) {
    const chunk = rows.slice(i, i + EXPO_BATCH_SIZE);
    const messages = chunk.map((row) => ({
      to: row.expo_push_token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
      const result = await response.json().catch(() => null);
      const tickets: any[] = Array.isArray(result?.data) ? result.data : [];

      const invalidUserIds: string[] = [];
      for (let j = 0; j < chunk.length; j++) {
        const ticket = tickets[j];
        if (ticket?.status === "ok") {
          sent++;
        } else {
          failed++;
          if (ticket?.details?.error === "DeviceNotRegistered") {
            invalidUserIds.push(chunk[j].user_id);
          }
        }
      }

      if (invalidUserIds.length > 0) {
        await supabase.from("push_tokens").delete().in("user_id", invalidUserIds);
        invalidTokensPruned += invalidUserIds.length;
      }
    } catch (err) {
      console.warn("[sendPushBatch] chunk failed", err);
      failed += chunk.length;
    }
  }

  return { sent, failed, invalidTokensPruned };
}
