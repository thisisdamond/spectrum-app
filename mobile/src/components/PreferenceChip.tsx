import { View } from "react-native";
import { AccessibleText } from "./AccessibleText";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

export function PreferenceChip({ label }: { label: string }) {
  return (
    <View style={{ backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
      <AccessibleText variant="caption">{label}</AccessibleText>
    </View>
  );
}
