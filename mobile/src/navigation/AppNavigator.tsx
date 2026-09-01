import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AccessibilityIntroScreen } from "../screens/AccessibilityIntroScreen";
import { LoginScreen, SignupScreen } from "../screens/AuthScreens";
import { ChatScreen } from "../screens/ChatScreen";
import { DiscoveryScreen } from "../screens/DiscoveryScreen";
import { LikesScreen } from "../screens/LikesScreen";
import { MatchesScreen } from "../screens/MatchesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";

export type AuthStackParams = { Welcome: undefined; AccessibilityIntro: undefined; Login: undefined; Signup: undefined };
export type RootStackParams = { Main: undefined; Chat: { name: string } };
type TabParams = { Discover: undefined; Likes: undefined; Matches: undefined; Profile: undefined; Settings: undefined };

const Auth = createNativeStackNavigator<AuthStackParams>();
const Root = createNativeStackNavigator<RootStackParams>();
const Tabs = createBottomTabNavigator<TabParams>();

function AuthNavigator() {
  return <Auth.Navigator screenOptions={{ headerBackTitle: "Back", headerTintColor: colors.primary, headerShadowVisible: false }}><Auth.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} /><Auth.Screen name="AccessibilityIntro" component={AccessibilityIntroScreen} options={{ title: "Comfort settings" }} /><Auth.Screen name="Login" component={LoginScreen} options={{ title: "Log in" }} /><Auth.Screen name="Signup" component={SignupScreen} options={{ title: "Sign up" }} /></Auth.Navigator>;
}

function MainTabs() {
  return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 13, fontWeight: "700" }, tabBarStyle: { minHeight: 64, paddingTop: 8 } }}><Tabs.Screen name="Discover" component={DiscoveryScreen} /><Tabs.Screen name="Likes" component={LikesScreen} /><Tabs.Screen name="Matches" component={MatchesScreen} /><Tabs.Screen name="Profile" component={ProfileScreen} /><Tabs.Screen name="Settings" component={SettingsScreen} /></Tabs.Navigator>;
}

export function AppNavigator() {
  const authenticated = useAppStore((state) => state.isAuthenticated);
  const highContrast = useAppStore((state) => state.accessibility.highContrast);
  const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: highContrast ? colors.highContrast.background : colors.background, card: highContrast ? colors.highContrast.surface : colors.surface, text: highContrast ? colors.highContrast.text : colors.text, primary: colors.primary, border: highContrast ? colors.highContrast.border : colors.border } };
  return <NavigationContainer theme={navTheme}>{authenticated ? <Root.Navigator><Root.Screen name="Main" component={MainTabs} options={{ headerShown: false }} /><Root.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params.name, headerTintColor: colors.primary })} /></Root.Navigator> : <AuthNavigator />}</NavigationContainer>;
}
