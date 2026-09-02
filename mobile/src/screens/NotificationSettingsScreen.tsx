import { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { api } from "../services/api";
import { registerPushNotifications } from "../services/notifications";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import type { NotificationSettings } from "../types";

const defaults: NotificationSettings = { newMatches: true, newMessages: true, newLikes: true, messagePreviews: false, batched: true, pausedUntil: null };
type BooleanKey = "newMatches" | "newMessages" | "newLikes" | "messagePreviews" | "batched";

export function NotificationSettingsScreen() {
  const quiet = useAppStore((state) => state.accessibility.quietNotifications);
  const updateAccessibility = useAppStore((state) => state.updateAccessibility);
  const [settings, setSettings] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { void api<{ settings: NotificationSettings }>("/settings/notifications").then(({ settings: value }) => setSettings(value)).catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Settings could not be loaded")); }, []);
  const update = async (change: Partial<NotificationSettings>) => {
    const previous = settings; setSettings({ ...settings, ...change }); setNotice(null);
    try { const { settings: saved } = await api<{ settings: NotificationSettings }>("/settings/notifications", { method: "PUT", body: JSON.stringify(change) }); setSettings(saved); }
    catch (error) { setSettings(previous); setNotice(error instanceof Error ? error.message : "Setting could not be saved"); }
  };
  const enableDevice = async () => {
    setBusy(true); setNotice(null);
    try { await registerPushNotifications(); setNotice("This device is registered for Spectrum notifications."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Device notifications could not be enabled"); }
    finally { setBusy(false); }
  };
  const row = (label: string, key: BooleanKey) => <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}><AccessibleText style={{ flex: 1 }}>{label}</AccessibleText><Switch accessibilityLabel={label} value={settings[key]} onValueChange={(value) => void update({ [key]: value })} trackColor={{ true: colors.primary }} /></View>;
  const paused = Boolean(settings.pausedUntil && new Date(settings.pausedUntil) > new Date());
  return <Screen>
    <AccessibleText variant="title" weight="800">Notifications</AccessibleText>
    <Card><AccessibleText weight="800">This device</AccessibleText><AccessibleText color={colors.muted}>Push notifications require an EAS project ID and a development or production build. Expo Go does not support remote push notifications.</AccessibleText><Button label={busy ? "Registering…" : "Enable notifications on this device"} disabled={busy} onPress={() => void enableDevice()} /></Card>
    <Card><AccessibleText weight="800">What to send</AccessibleText>{row("New matches", "newMatches")}{row("New messages", "newMessages")}{row("New likes", "newLikes")}{row("Show message previews", "messagePreviews")}</Card>
    <Card><AccessibleText weight="800">Comfort</AccessibleText><View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}><AccessibleText style={{ flex: 1 }}>Quiet notifications without sound</AccessibleText><Switch accessibilityLabel="Quiet notifications without sound" value={quiet} onValueChange={(value) => updateAccessibility({ quietNotifications: value })} trackColor={{ true: colors.primary }} /></View><Button label={paused ? "Resume notifications" : "Pause for 24 hours"} variant="secondary" onPress={() => void update({ pausedUntil: paused ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })} /></Card>
    {notice ? <Card accessibilityLiveRegion="polite"><AccessibleText color={notice.includes("registered") ? colors.success : colors.error}>{notice}</AccessibleText></Card> : null}
  </Screen>;
}
