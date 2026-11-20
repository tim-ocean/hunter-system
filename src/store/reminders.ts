import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL = "daily-quest";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/**
 * Turns the two daily System notices on or off. Resolves false when the player
 * declined notification permission, so the setting can stay off.
 */
export async function syncReminders(on: boolean): Promise<boolean> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!on) return true;
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Daily Quest", importance: Notifications.AndroidImportance.DEFAULT });
    }
    const daily = (hour: number) => ({
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      ...(Platform.OS === "android" ? { channelId: CHANNEL } : {}),
    }) as const;
    await Notifications.scheduleNotificationAsync({
      content: { title: "[SYSTEM] Daily Quest has arrived", body: "Forge Your Strength. Today's goals are waiting." },
      trigger: daily(9),
    });
    await Notifications.scheduleNotificationAsync({
      content: { title: "[SYSTEM] Warning", body: "Unfinished goals at midnight send you to the Penalty Trial." },
      trigger: daily(21),
    });
    return true;
  } catch {
    return false;
  }
}
