import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAppStore } from "./src/store/useAppStore";

export default function App() {
  const highContrast = useAppStore((state) => state.accessibility.highContrast);
  return (
    <SafeAreaProvider>
      <StatusBar style={highContrast ? "light" : "dark"} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
