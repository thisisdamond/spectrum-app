import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ChoiceChip } from "../components/ChoiceChip";
import { Screen } from "../components/Screen";
import type { RootStackParams } from "../navigation/AppNavigator";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

const communicationOptions = ["Direct and clear", "Gentle and gradual", "Text before calls", "Plan ahead", "Extra processing time", "Regular check-ins"];
const environmentOptions = ["Quiet café", "Museum", "Park", "Bookshop", "At-home activity", "Low-key restaurant"];

function toggle(items: string[], value: string) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

export function DiscoveryFiltersScreen({ navigation }: NativeStackScreenProps<RootStackParams, "DiscoveryFilters">) {
  const saved = useAppStore((state) => state.discoveryFilters);
  const status = useAppStore((state) => state.discoveryStatus);
  const setFilters = useAppStore((state) => state.setDiscoveryFilters);
  const [minimum, setMinimum] = useState(saved.minCompatibility);
  const [communication, setCommunication] = useState(saved.communicationStyles ?? []);
  const [environments, setEnvironments] = useState(saved.dateEnvironments ?? []);
  const premium = status?.tier === "PREMIUM";

  if (!premium) return <Screen>
    <AccessibleText variant="title" weight="800">Advanced filters</AccessibleText>
    <Card>
      <AccessibleText weight="800">Premium filter controls</AccessibleText>
      <AccessibleText color={colors.muted}>Minimum compatibility, communication style, and date-environment filters are reserved for Premium. Your standard age, distance, gender, and dating-goal preferences always apply.</AccessibleText>
    </Card>
    <Button label="Use standard filters" onPress={() => { setFilters({}); navigation.goBack(); }} />
  </Screen>;

  return <Screen>
    <AccessibleText variant="title" weight="800">Advanced filters</AccessibleText>
    <AccessibleText color={colors.muted}>These narrow discovery after both people’s core preferences are checked.</AccessibleText>
    <Card>
      <AccessibleText weight="800">Minimum compatibility</AccessibleText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {[undefined, 60, 70, 80].map((value) => <ChoiceChip key={value ?? "any"} label={value ? `${value}%+` : "Any"} selected={minimum === value} onPress={() => setMinimum(value)} />)}
      </View>
      <AccessibleText weight="800">Communication</AccessibleText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{communicationOptions.map((value) => <ChoiceChip key={value} label={value} selected={communication.includes(value)} onPress={() => setCommunication(toggle(communication, value))} />)}</View>
      <AccessibleText weight="800">Date environments</AccessibleText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{environmentOptions.map((value) => <ChoiceChip key={value} label={value} selected={environments.includes(value)} onPress={() => setEnvironments(toggle(environments, value))} />)}</View>
    </Card>
    <Button label="Apply filters" onPress={() => { setFilters({ ...(minimum !== undefined ? { minCompatibility: minimum } : {}), ...(communication.length ? { communicationStyles: communication } : {}), ...(environments.length ? { dateEnvironments: environments } : {}) }); navigation.goBack(); }} />
  </Screen>;
}
