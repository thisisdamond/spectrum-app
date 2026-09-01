import { Pressable } from "react-native";
import { AccessibleText } from "./AccessibleText";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

export function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? colors.softBlue : colors.surface,
        borderColor: selected ? colors.primary : colors.border,
        borderWidth: selected ? 2 : 1,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <AccessibleText variant="caption" color={selected ? colors.primaryDark : colors.text} weight={selected ? "700" : "400"}>{label}</AccessibleText>
    </Pressable>
  );
}
