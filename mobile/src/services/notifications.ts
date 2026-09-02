import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { api } from "./api";

export function configureForegroundNotifications(quiet: boolean) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: !quiet,
      shouldSetBadge: false,
    }),
  });
}

export async function registerPushNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("spectrum-quiet", {
      name: "Quiet Spectrum updates",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: null,
    });
    await Notifications.setNotificationChannelAsync("spectrum-default", {
      name: "Spectrum updates",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }
  if (Platform.OS !== "ios" && Platform.OS !== "android") throw new Error("Push notifications are available in the iPhone and Android apps");
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Notification permission was not granted");
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    ?? Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("Set EXPO_PUBLIC_EAS_PROJECT_ID before registering this device");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api("/settings/notification-tokens", { method: "POST", body: JSON.stringify({ token, platform: Platform.OS }) });
  return token;
}
