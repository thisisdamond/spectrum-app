import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AccessibilityIntroScreen } from "../screens/AccessibilityIntroScreen";
import { ForgotPasswordScreen, LoginScreen, ResetPasswordScreen, SignupScreen, TwoFactorScreen, VerifyEmailScreen } from "../screens/AuthScreens";
import { ChatScreen } from "../screens/ChatScreen";
import { DiscoveryScreen } from "../screens/DiscoveryScreen";
import { DiscoveryFiltersScreen } from "../screens/DiscoveryFiltersScreen";
import { LikesScreen } from "../screens/LikesScreen";
import { MatchesScreen } from "../screens/MatchesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { BasicProfileSetupScreen, CommunicationSetupScreen, PhotosSetupScreen, PreferencesSetupScreen, PromptsSetupScreen, SensorySetupScreen } from "../screens/ProfileSetupScreens";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TwoFactorSettingsScreen } from "../screens/TwoFactorSettingsScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";

export type AuthStackParams = {
  Welcome: undefined;
  AccessibilityIntro: undefined;
  Login: undefined;
  Signup: undefined;
  VerifyEmail: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string } | undefined;
  TwoFactor: undefined;
};
export type SetupStackParams = { Basics: undefined; Preferences: undefined; Communication: undefined; Sensory: undefined; Photos: undefined; Prompts: undefined };
export type RootStackParams = { Main: undefined; Chat: { name: string }; DiscoveryFilters: undefined; ProfileSetup: undefined; TwoFactorSettings: undefined };
type TabParams = { Discover: undefined; Likes: undefined; Matches: undefined; Profile: undefined; Settings: undefined };

const Auth = createNativeStackNavigator<AuthStackParams>();
const Setup = createNativeStackNavigator<SetupStackParams>();
const Root = createNativeStackNavigator<RootStackParams>();
const Tabs = createBottomTabNavigator<TabParams>();

const stackOptions = { headerBackTitle: "Back", headerTintColor: colors.primary, headerShadowVisible: false } as const;

function AuthNavigator() {
  return <Auth.Navigator screenOptions={stackOptions}><Auth.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} /><Auth.Screen name="AccessibilityIntro" component={AccessibilityIntroScreen} options={{ title: "Comfort settings" }} /><Auth.Screen name="Login" component={LoginScreen} options={{ title: "Log in" }} /><Auth.Screen name="Signup" component={SignupScreen} options={{ title: "Sign up" }} /><Auth.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: "Verify email" }} /><Auth.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Password help" }} /><Auth.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: "New password" }} /><Auth.Screen name="TwoFactor" component={TwoFactorScreen} options={{ title: "Two-factor authentication" }} /></Auth.Navigator>;
}

function SetupNavigator() {
  const status = useAppStore((state) => state.setupStatus);
  const firstIncomplete = status?.steps.find((step) => !step.complete)?.key;
  const initialRoute = firstIncomplete === "preferences" ? "Preferences" : firstIncomplete === "communication" ? "Communication" : firstIncomplete === "sensory" ? "Sensory" : firstIncomplete === "photos" ? "Photos" : firstIncomplete === "prompts" ? "Prompts" : "Basics";
  return <Setup.Navigator initialRouteName={initialRoute} screenOptions={stackOptions}><Setup.Screen name="Basics" component={BasicProfileSetupScreen} options={{ title: "Profile setup" }} /><Setup.Screen name="Preferences" component={PreferencesSetupScreen} options={{ title: "Preferences" }} /><Setup.Screen name="Communication" component={CommunicationSetupScreen} options={{ title: "Communication" }} /><Setup.Screen name="Sensory" component={SensorySetupScreen} options={{ title: "Comfort" }} /><Setup.Screen name="Photos" component={PhotosSetupScreen} options={{ title: "Photos" }} /><Setup.Screen name="Prompts" component={PromptsSetupScreen} options={{ title: "Prompts" }} /></Setup.Navigator>;
}

function MainTabs() {
  return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 13, fontWeight: "700" }, tabBarStyle: { minHeight: 64, paddingTop: 8 } }}><Tabs.Screen name="Discover" component={DiscoveryScreen} /><Tabs.Screen name="Likes" component={LikesScreen} /><Tabs.Screen name="Matches" component={MatchesScreen} /><Tabs.Screen name="Profile" component={ProfileScreen} /><Tabs.Screen name="Settings" component={SettingsScreen} /></Tabs.Navigator>;
}

function MainNavigator() {
  return <Root.Navigator screenOptions={stackOptions}><Root.Screen name="Main" component={MainTabs} options={{ headerShown: false }} /><Root.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params.name })} /><Root.Screen name="DiscoveryFilters" component={DiscoveryFiltersScreen} options={{ title: "Discovery filters" }} /><Root.Screen name="ProfileSetup" component={SetupNavigator} options={{ headerShown: false }} /><Root.Screen name="TwoFactorSettings" component={TwoFactorSettingsScreen} options={{ title: "Account security" }} /></Root.Navigator>;
}

export function AppNavigator() {
  const signedIn = useAppStore((state) => state.sessionStatus === "signedIn");
  const setupComplete = useAppStore((state) => state.setupStatus?.complete === true);
  const highContrast = useAppStore((state) => state.accessibility.highContrast);
  const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: highContrast ? colors.highContrast.background : colors.background, card: highContrast ? colors.highContrast.surface : colors.surface, text: highContrast ? colors.highContrast.text : colors.text, primary: colors.primary, border: highContrast ? colors.highContrast.border : colors.border } };
  return <NavigationContainer theme={navTheme}>{signedIn ? (setupComplete ? <MainNavigator /> : <SetupNavigator />) : <AuthNavigator />}</NavigationContainer>;
}
