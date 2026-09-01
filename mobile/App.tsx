import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAppStore } from "./src/store/useAppStore";

export default function App() {
  const highContrast = useAppStore((state) => state.accessibility.highContrast);
  const sessionStatus = useAppStore((state) => state.sessionStatus);
  const initialize = useAppStore((state) => state.initialize);
  useEffect(() => { void initialize(); }, [initialize]);
  return (
    <SafeAreaProvider>
      <StatusBar style={highContrast ? "light" : "dark"} />
      {sessionStatus === "loading"
        ? <View accessibilityLabel="Loading Spectrum" style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" /></View>
        : <AppNavigator />}
    </SafeAreaProvider>
  );
}
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
