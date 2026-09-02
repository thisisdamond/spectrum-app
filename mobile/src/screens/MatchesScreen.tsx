import { useCallback } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image, Pressable, View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import type { RootStackParams } from "../navigation/AppNavigator";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";

export function MatchesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const matches = useAppStore((state) => state.matches);
  const loading = useAppStore((state) => state.matchesLoading);
  const error = useAppStore((state) => state.matchesError);
  const load = useAppStore((state) => state.loadMatches);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <Screen>
    <AccessibleText variant="title" weight="800">Matches</AccessibleText>
    {loading ? <Card><AccessibleText>Loading matches…</AccessibleText></Card> : null}
    {error ? <Card><AccessibleText color={colors.error}>{error}</AccessibleText></Card> : null}
    {!loading && matches.length === 0 ? <Card><AccessibleText>Your mutual matches will appear here.</AccessibleText></Card> : null}
    {matches.map((match) => {
      const profile = match.otherUser.profile;
      const preview = match.lastMessage?.body ?? "You matched! Say hello when you’re ready.";
      return <Pressable key={match.id} accessibilityRole="button" accessibilityLabel={`Open chat with ${profile.displayName}`} onPress={() => navigation.navigate("Chat", { matchId: match.id, userId: match.otherUser.userId, name: profile.displayName })}>
        <Card style={{ flexDirection: "row", alignItems: "center" }}>
          {match.otherUser.photo ? <Image accessibilityLabel={match.otherUser.photo.altText ?? `Profile photo for ${profile.displayName}`} source={{ uri: match.otherUser.photo.url, headers: match.otherUser.photo.headers }} style={{ width: 64, height: 64, borderRadius: radius.pill }} /> : (
            <View style={{ width: 64, height: 64, borderRadius: radius.pill, backgroundColor: colors.softBlue, alignItems: "center", justifyContent: "center" }}><AccessibleText color={colors.primary} weight="800">{profile.displayName[0]}</AccessibleText></View>
          )}
          <View style={{ flex: 1, gap: spacing.xs }}>
            <AccessibleText weight="800">{profile.displayName}</AccessibleText>
            <AccessibleText color={colors.muted} numberOfLines={2}>{preview}</AccessibleText>
            {match.unreadCount > 0 ? <AccessibleText variant="caption" color={colors.primary} weight="800">{match.unreadCount} unread</AccessibleText> : null}
            {match.compatibilityScore !== null ? <AccessibleText variant="caption" color={colors.primaryDark}>{Math.round(match.compatibilityScore)}% compatibility at match time</AccessibleText> : null}
          </View>
        </Card>
      </Pressable>;
    })}
  </Screen>;
}
