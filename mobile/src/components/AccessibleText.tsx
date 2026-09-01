import type { PropsWithChildren } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type Props = PropsWithChildren<TextProps & { variant?: keyof typeof typography; color?: string; weight?: TextStyle["fontWeight"] }>;

export function AccessibleText({ children, variant = "body", color, weight, style, ...props }: Props) {
  const settings = useAppStore((state) => state.accessibility);
  const textColor = color ?? (settings.highContrast ? colors.highContrast.text : colors.text);
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={2}
      style={[{ color: textColor, fontSize: typography[variant] * settings.textScale, lineHeight: typography[variant] * settings.textScale * 1.4, fontWeight: weight }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}
