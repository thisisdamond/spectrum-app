import type { PropsWithChildren } from "react";
import { ScrollView, type ScrollViewProps, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function Screen({ children, contentContainerStyle, ...props }: PropsWithChildren<ScrollViewProps>) {
  const insets = useSafeAreaInsets();
  const highContrast = useAppStore((state) => state.accessibility.highContrast);
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: highContrast ? colors.highContrast.background : colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, spacing.lg), paddingBottom: Math.max(insets.bottom, spacing.xxl) }, contentContainerStyle]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.lg } });
