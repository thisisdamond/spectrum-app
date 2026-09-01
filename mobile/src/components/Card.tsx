import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const highContrast = useAppStore((state) => state.accessibility.highContrast);
  return (
    <View
      style={[{
        backgroundColor: highContrast ? colors.highContrast.surface : colors.surface,
        borderColor: highContrast ? colors.highContrast.border : colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.md,
      }, style]}
      {...props}
    >
      {children}
    </View>
  );
}
