import { Switch, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import type { AccessibilitySettings } from "../types";
import type { RootStackParams } from "../navigation/AppNavigator";

type BooleanAccessibilityKey = "calmMode" | "highContrast" | "reducedMotion" | "quietNotifications" | "noAutoplayVideo";

function Toggle({ label, setting }: { label: string; setting: BooleanAccessibilityKey }) {
  const value = useAppStore((state) => state.accessibility[setting]);
  const update = useAppStore((state) => state.updateAccessibility);
  return <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}><AccessibleText style={{ flex: 1 }}>{label}</AccessibleText><Switch accessibilityLabel={label} value={value} onValueChange={(next) => update({ [setting]: next })} trackColor={{ true: colors.primary }} /></View>;
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const settings = useAppStore((state) => state.accessibility);
  const profile = useAppStore((state) => state.profile);
  const saveProfile = useAppStore((state) => state.saveProfile);
  const update = useAppStore((state) => state.updateAccessibility);
  const signOut = useAppStore((state) => state.signOut);
  const breakActive = Boolean(settings.breakModeUntil && new Date(settings.breakModeUntil) > new Date());
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">Settings</AccessibleText>
      <Card><AccessibleText variant="bodyLarge" weight="800">Accessibility</AccessibleText><Toggle label="Calm Mode" setting="calmMode" /><Toggle label="High contrast" setting="highContrast" /><Toggle label="Reduced motion" setting="reducedMotion" /><Toggle label="Quiet notifications" setting="quietNotifications" /><Toggle label="Never autoplay video" setting="noAutoplayVideo" /><AccessibleText>Text size: {Math.round(settings.textScale * 100)}%</AccessibleText><View style={{ flexDirection: "row", gap: 8 }}><Button label="Smaller" variant="secondary" onPress={() => update({ textScale: Math.max(0.85, settings.textScale - 0.1) })} style={{ flex: 1 }} /><Button label="Larger" variant="secondary" onPress={() => update({ textScale: Math.min(1.6, settings.textScale + 0.1) })} style={{ flex: 1 }} /></View><AccessibleText variant="caption" color={colors.muted}>Changes sync to your Spectrum account automatically.</AccessibleText></Card>
      <Card><AccessibleText variant="bodyLarge" weight="800">Discovery</AccessibleText><Button label={profile?.discoveryPaused ? "Resume discovery" : "Pause discovery"} variant="secondary" onPress={() => void saveProfile({ discoveryPaused: !profile?.discoveryPaused }, true)} /><Button label={breakActive ? "End break" : "I need a 24-hour break"} variant="secondary" onPress={() => update({ breakModeUntil: breakActive ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })} /></Card>
      <Card><AccessibleText variant="bodyLarge" weight="800">Safety & account</AccessibleText><Button label="Two-factor authentication" variant="quiet" onPress={() => navigation.navigate("TwoFactorSettings")} /><Button label="Safety center" variant="quiet" onPress={() => {}} /><Button label="Blocked users" variant="quiet" onPress={() => {}} /><Button label="Log out" variant="danger" onPress={() => void signOut()} /></Card>
    </Screen>
  );
}
