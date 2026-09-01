import { View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { ProfileCard } from "../components/ProfileCard";
import { Screen } from "../components/Screen";
import { demoProfiles } from "../data/demoProfiles";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function DiscoveryScreen() {
  const index = useAppStore((state) => state.discoveryIndex);
  const nextProfile = useAppStore((state) => state.nextProfile);
  const profile = demoProfiles[index % demoProfiles.length]!;
  return (
    <Screen>
      <View>
        <AccessibleText variant="title" weight="800">Discover</AccessibleText>
        <AccessibleText color={colors.muted}>One thoughtful profile at a time.</AccessibleText>
      </View>
      <ProfileCard profile={profile} />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Button label="Pass" variant="secondary" onPress={nextProfile} style={{ flex: 1 }} />
        <Button label="Like" accessibilityHint={`Likes ${profile.name}'s profile`} onPress={nextProfile} style={{ flex: 1 }} />
      </View>
      <Button label="I need a break" variant="quiet" onPress={() => {}} />
    </Screen>
  );
}
