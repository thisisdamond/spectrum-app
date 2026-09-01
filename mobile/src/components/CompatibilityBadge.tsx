import { View } from "react-native";
import { AccessibleText } from "./AccessibleText";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

export function CompatibilityBadge({ score }: { score: number }) {
  return (
    <View accessibilityLabel={`${score}% compatibility`} style={{ backgroundColor: colors.softBlue, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
      <AccessibleText color={colors.primaryDark} weight="800">{score}% fit</AccessibleText>
    </View>
  );
}
