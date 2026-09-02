import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAppStore } from "./src/store/useAppStore";
import { configureForegroundNotifications } from "./src/services/notifications";

export default function App() {
  const highContrast = useAppStore((state) => state.accessibility.highContrast);
  const sessionStatus = useAppStore((state) => state.sessionStatus);
  const initialize = useAppStore((state) => state.initialize);
  const quietNotifications = useAppStore((state) => state.accessibility.quietNotifications);
  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => { configureForegroundNotifications(quietNotifications); }, [quietNotifications]);
  return (
    <SafeAreaProvider>
      <StatusBar style={highContrast ? "light" : "dark"} />
      {sessionStatus === "loading"
        ? <View accessibilityLabel="Loading Spectrum" style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" /></View>
        : <AppNavigator />}
    </SafeAreaProvider>
  );
}
