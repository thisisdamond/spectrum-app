import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { AccessibleText } from "./AccessibleText";
import { Button } from "./Button";
import { Card } from "./Card";
import { CompatibilityBadge } from "./CompatibilityBadge";
import { PreferenceChip } from "./PreferenceChip";
import { PromptCard } from "./PromptCard";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { DiscoveryCandidate } from "../types";

const readablePrompt = (value: string) => value.replace(/[-_]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());

export function ProfileCard({ candidate, compact = false }: { candidate: DiscoveryCandidate; compact?: boolean }) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const { profile } = candidate;
  const photo = candidate.photos[0];
  const prompt = candidate.prompts[0];
  const location = [profile.city, profile.region].filter(Boolean).join(", ");
  return (
    <View style={styles.wrapper}>
      {photo ? <Image accessibilityLabel={photo.altText ?? `Profile photo for ${profile.displayName}`} source={{ uri: photo.url, headers: photo.headers }} style={[styles.photo, compact && styles.compactPhoto]} resizeMode="cover" /> : (
        <View accessibilityLabel={`No profile photo available for ${profile.displayName}`} style={[styles.photo, compact && styles.compactPhoto, styles.photoFallback]}>
          <AccessibleText variant="display" color={colors.primary} weight="800">{profile.displayName.slice(0, 1)}</AccessibleText>
        </View>
      )}
      <Card style={styles.details}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AccessibleText variant="title" weight="800">{profile.displayName}, {profile.age}</AccessibleText>
            <AccessibleText color={colors.muted}>{[profile.pronouns, location, candidate.distanceKm === null ? null : `${candidate.distanceKm} km away`].filter(Boolean).join(" · ")}</AccessibleText>
          </View>
          <CompatibilityBadge score={candidate.compatibility.total} />
        </View>
        <AccessibleText>{profile.bio ?? "This person is still adding their introduction."}</AccessibleText>
        <View style={styles.chips}>{profile.interests.slice(0, compact ? 4 : 8).map((item) => <PreferenceChip key={item} label={item} />)}</View>
        <AccessibleText variant="caption" color={colors.muted} weight="700">COMMUNICATION</AccessibleText>
        <View style={styles.chips}>{profile.communicationStyle.slice(0, compact ? 3 : 6).map((item) => <PreferenceChip key={item} label={item} />)}</View>
        {!compact && prompt ? <PromptCard question={readablePrompt(prompt.promptKey)} answer={prompt.answer} /> : null}
        <Button label={detailsVisible ? "Hide compatibility details" : "Why this match?"} variant="quiet" onPress={() => setDetailsVisible((visible) => !visible)} />
        {detailsVisible ? <View style={styles.explanation}>
          <AccessibleText weight="800">{candidate.explanation.summary}</AccessibleText>
          {candidate.explanation.highlights.map((highlight) => <AccessibleText key={highlight} color={colors.muted}>• {highlight}</AccessibleText>)}
          {candidate.explanation.dimensions.map((dimension) => (
            <View key={dimension.key} style={styles.dimensionRow}>
              <AccessibleText variant="caption">{dimension.label}</AccessibleText>
              <AccessibleText variant="caption" weight="700">{Math.round((dimension.score / dimension.maxScore) * 100)}%</AccessibleText>
            </View>
          ))}
          <AccessibleText variant="caption" color={colors.muted}>Compatibility is a guide based only on the preferences you both chose. It is not a guarantee or diagnosis.</AccessibleText>
        </View> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  photo: { width: "100%", height: 360, borderRadius: radius.lg },
  compactPhoto: { height: 220 },
  photoFallback: { backgroundColor: colors.softBlue, alignItems: "center", justifyContent: "center" },
  details: { marginTop: -spacing.xl },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  explanation: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.softBlue },
  dimensionRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
});
