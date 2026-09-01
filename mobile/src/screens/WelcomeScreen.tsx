import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { InfinityLogo } from "../components/InfinityLogo";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { AuthStackParams } from "../navigation/AppNavigator";

export function WelcomeScreen({ navigation }: NativeStackScreenProps<AuthStackParams, "Welcome">) {
  return (
    <Screen contentContainerStyle={{ justifyContent: "center" }}>
      <View style={{ alignItems: "center", gap: spacing.lg }}>
        <InfinityLogo size={104} />
        <AccessibleText variant="display" weight="800">Spectrum</AccessibleText>
        <AccessibleText variant="bodyLarge" color={colors.muted} style={{ textAlign: "center" }}>
          Dating with more clarity, less guessing, and space to be yourself.
        </AccessibleText>
      </View>
      <View style={{ gap: spacing.md }}>
        <Button label="Create my profile" onPress={() => navigation.navigate("AccessibilityIntro")} />
        <Button label="I already have an account" variant="secondary" onPress={() => navigation.navigate("Login")} />
      </View>
      <AccessibleText variant="caption" color={colors.muted} style={{ textAlign: "center" }}>For adults 18+. Your diagnosis is never required.</AccessibleText>
    </Screen>
  );
}
