import { StyleSheet, View } from "react-native";
import { AccessibleText } from "./AccessibleText";
import { Card } from "./Card";
import { CompatibilityBadge } from "./CompatibilityBadge";
import { PreferenceChip } from "./PreferenceChip";
import { PromptCard } from "./PromptCard";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { DemoProfile } from "../types";

export function ProfileCard({ profile }: { profile: DemoProfile }) {
  return (
    <View style={styles.wrapper}>
      <View accessibilityLabel={`Profile photo placeholder for ${profile.name}`} style={[styles.photo, { backgroundColor: profile.accent }]}>
        <AccessibleText variant="display" color={colors.surface} weight="800">{profile.name.slice(0, 1)}</AccessibleText>
      </View>
      <Card style={styles.details}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AccessibleText variant="title" weight="800">{profile.name}, {profile.age}</AccessibleText>
            <AccessibleText color={colors.muted}>{profile.pronouns} · {profile.city}</AccessibleText>
          </View>
          <CompatibilityBadge score={profile.compatibility} />
        </View>
        <AccessibleText>{profile.bio}</AccessibleText>
        <View style={styles.chips}>{profile.interests.map((item) => <PreferenceChip key={item} label={item} />)}</View>
        <AccessibleText variant="caption" color={colors.muted} weight="700">COMMUNICATION</AccessibleText>
        <View style={styles.chips}>{profile.communication.map((item) => <PreferenceChip key={item} label={item} />)}</View>
        <PromptCard question={profile.prompt.question} answer={profile.prompt.answer} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  photo: { height: 250, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  details: { marginTop: -spacing.xl },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
