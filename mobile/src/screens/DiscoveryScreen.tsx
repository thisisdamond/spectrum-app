import { useCallback } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ProfileCard } from "../components/ProfileCard";
import { Screen } from "../components/Screen";
import type { RootStackParams } from "../navigation/AppNavigator";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export function DiscoveryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const candidates = useAppStore((state) => state.discoveryCandidates);
  const status = useAppStore((state) => state.discoveryStatus);
  const loading = useAppStore((state) => state.discoveryLoading);
  const error = useAppStore((state) => state.discoveryError);
  const actionUserId = useAppStore((state) => state.discoveryActionUserId);
  const breakModeUntil = useAppStore((state) => state.accessibility.breakModeUntil);
  const lastMatch = useAppStore((state) => state.lastMatch);
  const load = useAppStore((state) => state.loadDiscovery);
  const like = useAppStore((state) => state.likeCandidate);
  const pass = useAppStore((state) => state.passCandidate);
  const backtrack = useAppStore((state) => state.backtrack);
  const clearLastMatch = useAppStore((state) => state.clearLastMatch);
  const startDiscoveryBreak = useAppStore((state) => state.startDiscoveryBreak);
  const candidate = candidates[0];
  const breakActive = Boolean(breakModeUntil && new Date(breakModeUntil) > new Date());

  useFocusEffect(useCallback(() => { if (!breakActive) void load(); }, [breakActive, load]));

  return <Screen refreshControl={undefined}>
    <View style={{ gap: spacing.xs }}>
      <AccessibleText variant="title" weight="800">Discover</AccessibleText>
      <AccessibleText color={colors.muted}>One thoughtful profile at a time.</AccessibleText>
    </View>
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <Button label="Filters" variant="secondary" onPress={() => navigation.navigate("DiscoveryFilters")} style={{ flex: 1 }} />
      <Button label="Refresh" variant="secondary" onPress={() => void load()} disabled={loading} style={{ flex: 1 }} />
    </View>
    {status?.likesRemaining !== null && status?.likesRemaining !== undefined ? <AccessibleText variant="caption" color={colors.muted}>{status.likesRemaining} free likes left today · resets at midnight UTC</AccessibleText> : null}
    {lastMatch ? <Card accessibilityLiveRegion="polite">
      <AccessibleText variant="title" weight="800">It’s a match with {lastMatch.name}!</AccessibleText>
      <AccessibleText>You both liked each other. Start a conversation whenever you feel ready.</AccessibleText>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Button label="Not now" variant="secondary" onPress={clearLastMatch} style={{ flex: 1 }} />
        <Button label="Say hello" onPress={() => { clearLastMatch(); navigation.navigate("Chat", { name: lastMatch.name }); }} style={{ flex: 1 }} />
      </View>
    </Card> : null}
    {error ? <Card><AccessibleText color={colors.error}>{error}</AccessibleText></Card> : null}
    {breakActive ? <Card><AccessibleText weight="800">Your discovery break is active.</AccessibleText><AccessibleText color={colors.muted}>Profiles and incoming likes are paused until {new Date(breakModeUntil!).toLocaleString()} or until you end the break in Settings.</AccessibleText></Card> : null}
    {loading && !candidate ? <Card><AccessibleText>Finding profiles that fit both people’s preferences…</AccessibleText></Card> : null}
    {!loading && !candidate && !breakActive ? <Card>
      <AccessibleText weight="800">You’re caught up for now.</AccessibleText>
      <AccessibleText color={colors.muted}>Try again later or gently widen your standard profile preferences.</AccessibleText>
    </Card> : null}
    {candidate ? <>
      <ProfileCard candidate={candidate} />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Button label="Pass" variant="secondary" disabled={actionUserId === candidate.userId} onPress={() => void pass(candidate.userId).catch(() => undefined)} style={{ flex: 1 }} />
        <Button label="Like" accessibilityHint={`Likes ${candidate.profile.displayName}'s profile`} disabled={actionUserId === candidate.userId || status?.likesRemaining === 0} onPress={() => void like(candidate.userId).catch(() => undefined)} style={{ flex: 1 }} />
      </View>
    </> : null}
    {status?.tier === "PREMIUM" ? <Button label="Backtrack last pass" variant="quiet" disabled={!status.backtrackAvailable || loading} onPress={() => void backtrack()} /> : null}
    <Button label="I need a 24-hour break" variant="quiet" onPress={startDiscoveryBreak} />
  </Screen>;
}
