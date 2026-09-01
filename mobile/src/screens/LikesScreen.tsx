import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ProfileCard } from "../components/ProfileCard";
import { Screen } from "../components/Screen";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function LikesScreen() {
  const likes = useAppStore((state) => state.incomingLikes);
  const loading = useAppStore((state) => state.likesLoading);
  const loadError = useAppStore((state) => state.likesError);
  const interactionError = useAppStore((state) => state.discoveryError);
  const status = useAppStore((state) => state.discoveryStatus);
  const lastMatch = useAppStore((state) => state.lastMatch);
  const actionUserId = useAppStore((state) => state.discoveryActionUserId);
  const breakModeUntil = useAppStore((state) => state.accessibility.breakModeUntil);
  const load = useAppStore((state) => state.loadIncomingLikes);
  const likeCandidate = useAppStore((state) => state.likeCandidate);
  const passCandidate = useAppStore((state) => state.passCandidate);
  const clearLastMatch = useAppStore((state) => state.clearLastMatch);
  const breakActive = Boolean(breakModeUntil && new Date(breakModeUntil) > new Date());
  useFocusEffect(useCallback(() => { if (!breakActive) void load(); }, [breakActive, load]));

  return <Screen>
    <AccessibleText variant="title" weight="800">Likes you</AccessibleText>
    <AccessibleText color={colors.muted}>Profiles here already expressed interest. You are never required to respond.</AccessibleText>
    {breakActive ? <Card><AccessibleText weight="800">Your discovery break is active.</AccessibleText><AccessibleText color={colors.muted}>Incoming likes will be waiting after your break.</AccessibleText></Card> : null}
    {lastMatch ? <Card accessibilityLiveRegion="polite"><AccessibleText variant="title" weight="800">It’s a match with {lastMatch.name}!</AccessibleText><AccessibleText>You can find this match in the Matches tab whenever you’re ready.</AccessibleText><Button label="Got it" onPress={clearLastMatch} /></Card> : null}
    {status?.likesRemaining !== null && status?.likesRemaining !== undefined ? <AccessibleText variant="caption" color={colors.muted}>{status.likesRemaining} free likes left today</AccessibleText> : null}
    {loading ? <Card><AccessibleText>Loading likes…</AccessibleText></Card> : null}
    {loadError || interactionError ? <Card><AccessibleText color={colors.error}>{loadError ?? interactionError}</AccessibleText></Card> : null}
    {!loading && likes.length === 0 ? <Card><AccessibleText>No new likes right now. We’ll keep this space calm and chronological.</AccessibleText></Card> : null}
    {likes.map((like) => <View key={like.id} style={{ gap: spacing.md }}>
      {like.comment ? <Card><AccessibleText variant="caption" color={colors.muted}>THEIR NOTE</AccessibleText><AccessibleText>{like.comment}</AccessibleText></Card> : null}
      <ProfileCard candidate={like.candidate} compact />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Button label="Pass" variant="secondary" disabled={actionUserId === like.candidate.userId} onPress={() => void passCandidate(like.candidate.userId).catch(() => undefined)} style={{ flex: 1 }} />
        <Button label="Like back" disabled={actionUserId === like.candidate.userId || status?.likesRemaining === 0} onPress={() => void likeCandidate(like.candidate.userId).catch(() => undefined)} style={{ flex: 1 }} />
      </View>
    </View>)}
  </Screen>;
}
