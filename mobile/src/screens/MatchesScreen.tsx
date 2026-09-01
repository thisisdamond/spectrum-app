import { Pressable, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AccessibleText } from "../components/AccessibleText";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { demoProfiles } from "../data/demoProfiles";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

export function MatchesScreen() {
  const navigation = useNavigation<any>();
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">Matches</AccessibleText>
      {demoProfiles.slice(0, 2).map((profile) => (
        <Pressable key={profile.id} accessibilityRole="button" accessibilityLabel={`Open chat with ${profile.name}`} onPress={() => navigation.navigate("Chat", { name: profile.name })}>
          <Card style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 56, height: 56, borderRadius: radius.pill, backgroundColor: profile.accent, alignItems: "center", justifyContent: "center" }}><AccessibleText color={colors.surface} weight="800">{profile.name[0]}</AccessibleText></View>
            <View style={{ flex: 1, gap: spacing.xs }}><AccessibleText weight="800">{profile.name}</AccessibleText><AccessibleText color={colors.muted}>You matched! Say hello when you’re ready.</AccessibleText></View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
