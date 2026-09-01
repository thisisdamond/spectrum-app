import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export function Input({ style, ...props }: TextInputProps) {
  const highContrast = useAppStore((state) => state.accessibility.highContrast);
  return (
    <TextInput
      allowFontScaling
      placeholderTextColor={highContrast ? colors.highContrast.muted : colors.muted}
      style={[styles.input, {
        backgroundColor: highContrast ? colors.highContrast.surface : colors.surface,
        borderColor: highContrast ? colors.highContrast.border : colors.border,
        color: highContrast ? colors.highContrast.text : colors.text,
      }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.body,
  },
});
