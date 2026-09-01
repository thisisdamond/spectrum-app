import { Switch, View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import type { AccessibilitySettings } from "../types";

function Toggle({ label, setting }: { label: string; setting: keyof Omit<AccessibilitySettings, "textScale"> }) {
  const value = useAppStore((state) => state.accessibility[setting]);
  const update = useAppStore((state) => state.updateAccessibility);
  return <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}><AccessibleText style={{ flex: 1 }}>{label}</AccessibleText><Switch accessibilityLabel={label} value={value} onValueChange={(next) => update({ [setting]: next })} trackColor={{ true: colors.primary }} /></View>;
}

export function SettingsScreen() {
  const settings = useAppStore((state) => state.accessibility);
  const update = useAppStore((state) => state.updateAccessibility);
  const signOut = useAppStore((state) => state.signOut);
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">Settings</AccessibleText>
      <Card><AccessibleText variant="bodyLarge" weight="800">Accessibility</AccessibleText><Toggle label="Calm Mode" setting="calmMode" /><Toggle label="High contrast" setting="highContrast" /><Toggle label="Reduced motion" setting="reducedMotion" /><Toggle label="Quiet notifications" setting="quietNotifications" /><AccessibleText>Text size: {Math.round(settings.textScale * 100)}%</AccessibleText><View style={{ flexDirection: "row", gap: 8 }}><Button label="Smaller" variant="secondary" onPress={() => update({ textScale: Math.max(0.85, settings.textScale - 0.1) })} style={{ flex: 1 }} /><Button label="Larger" variant="secondary" onPress={() => update({ textScale: Math.min(1.6, settings.textScale + 0.1) })} style={{ flex: 1 }} /></View></Card>
      <Card><AccessibleText variant="bodyLarge" weight="800">Discovery</AccessibleText><Button label="Pause discovery" variant="secondary" onPress={() => {}} /><Button label="I need a break" variant="secondary" onPress={() => {}} /></Card>
      <Card><AccessibleText variant="bodyLarge" weight="800">Safety & account</AccessibleText><Button label="Safety center" variant="quiet" onPress={() => {}} /><Button label="Blocked users" variant="quiet" onPress={() => {}} /><Button label="Log out" variant="danger" onPress={signOut} /></Card>
    </Screen>
  );
}
