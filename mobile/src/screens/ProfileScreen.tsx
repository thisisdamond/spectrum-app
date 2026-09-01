import { View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PreferenceChip } from "../components/PreferenceChip";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";

export function ProfileScreen() {
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">Your profile</AccessibleText>
      <Card><AccessibleText variant="bodyLarge" weight="800">Communication card</AccessibleText><AccessibleText color={colors.muted}>Share only the preferences that help a match understand you.</AccessibleText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><PreferenceChip label="I prefer direct communication" /><PreferenceChip label="I like planned dates" /><PreferenceChip label="I may take time to reply" /></View></Card>
      <Button label="Edit profile" onPress={() => {}} />
      <Button label="Preview public profile" variant="secondary" onPress={() => {}} />
    </Screen>
  );
}
