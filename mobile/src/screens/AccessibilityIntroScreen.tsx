import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { PreferenceChip } from "../components/PreferenceChip";
import type { AuthStackParams } from "../navigation/AppNavigator";

const features = ["Calm Mode on", "Reduced motion", "No autoplay", "Quiet notifications", "Adjustable text"];

export function AccessibilityIntroScreen({ navigation }: NativeStackScreenProps<AuthStackParams, "AccessibilityIntro">) {
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">Start in your comfort zone</AccessibleText>
      <AccessibleText>These defaults reduce sensory load. You can change every setting whenever you like.</AccessibleText>
      <Card>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {features.map((feature) => <PreferenceChip key={feature} label={feature} />)}
        </View>
      </Card>
      <Button label="These settings work for me" onPress={() => navigation.navigate("Signup")} />
      <Button label="Review accessibility settings" variant="secondary" onPress={() => navigation.navigate("Signup")} />
    </Screen>
  );
}
