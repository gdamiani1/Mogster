import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { authedFetch } from "./api";

const DAILY_REMINDER_ID = "daily-reminder";
const STREAK_SAVER_ID = "streak-saver";

// Foreground behavior: show alerts even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissionsAndRegister(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    status = newStatus;
  }
  if (status !== "granted") return null;

  const tokenResult = await Notifications.getExpoPushTokenAsync();
  const token = tokenResult.data;

  try {
    await authedFetch("/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expo_push_token: token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      }),
    });
  } catch (err) {
    console.warn("Failed to register push token with server", err);
  }

  await scheduleDailyReminder();
  return token;
}

export async function unregister(): Promise<void> {
  await cancelAllLocal();
  try {
    await authedFetch("/push/unregister", { method: "POST" });
  } catch (err) {
    console.warn("Failed to unregister push token", err);
  }
}

export async function scheduleDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "Your aura is rotting.",
      body: "Tap in and get rated before midnight.",
      data: { url: "mogster://" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 18,
      minute: 0,
    },
  });
}

export async function scheduleStreakSaver(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_SAVER_ID).catch(() => {});
  // Fire tomorrow at 22:00 local; user should check in before that to cancel
  const now = new Date();
  const trigger = new Date();
  trigger.setHours(22, 0, 0, 0);
  if (trigger.getTime() <= now.getTime()) trigger.setDate(trigger.getDate() + 1);
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_SAVER_ID,
    content: {
      title: "Your streak is about to die",
      body: "Two hours left. Check in or lose it.",
      data: { url: "mogster://" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

export async function cancelAllLocal(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getPermissionStatus() {
  return await Notifications.getPermissionsAsync();
}
