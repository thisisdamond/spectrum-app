import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { AccessibleText } from "./AccessibleText";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  disabled?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = "primary", disabled = false, accessibilityHint, style }: Props) {
  const background = variant === "primary" ? colors.primary : variant === "danger" ? colors.error : variant === "quiet" ? "transparent" : colors.softBlue;
  const foreground = variant === "primary" || variant === "danger" ? colors.surface : colors.primaryDark;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, { backgroundColor: background, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }, style]}
    >
      <AccessibleText color={foreground} weight="700">{label}</AccessibleText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
