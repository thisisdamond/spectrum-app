import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PreferenceChip } from "../components/PreferenceChip";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { useAppStore } from "../store/useAppStore";
import type { RootStackParams } from "../navigation/AppNavigator";

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const profile = useAppStore((state) => state.profile);
  const photos = useAppStore((state) => state.photos);
  const prompts = useAppStore((state) => state.prompts);
  if (!profile) return <Screen><AccessibleText variant="title" weight="800">Your profile</AccessibleText><AccessibleText>Your profile is still being prepared.</AccessibleText></Screen>;
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">Your profile</AccessibleText>
      <Card><AccessibleText variant="bodyLarge" weight="800">{profile.displayName}</AccessibleText><AccessibleText color={colors.muted}>{[profile.pronouns, profile.city].filter(Boolean).join(" · ")}</AccessibleText>{profile.bio ? <AccessibleText>{profile.bio}</AccessibleText> : null}<AccessibleText variant="caption">{photos.length} photo{photos.length === 1 ? "" : "s"} · {prompts.length} prompt{prompts.length === 1 ? "" : "s"}</AccessibleText></Card>
      <Card><AccessibleText variant="bodyLarge" weight="800">Communication card</AccessibleText><AccessibleText color={colors.muted}>Only the preferences you chose appear here.</AccessibleText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{profile.communicationStyle.map((item) => <PreferenceChip key={item} label={item} />)}</View>{profile.communicationCard ? Object.values(profile.communicationCard).filter(Boolean).map((item) => <AccessibleText key={item}>• {item}</AccessibleText>) : null}</Card>
      <Button label="Edit profile" onPress={() => navigation.navigate("ProfileSetup")} />
    </Screen>
  );
}
