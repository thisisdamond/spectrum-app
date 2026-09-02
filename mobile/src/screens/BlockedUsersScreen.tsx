import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Image, View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";
import { api, getMediaHeaders } from "../services/api";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { BlockedUser } from "../types";

export function BlockedUsersScreen() {
  const [blocks, setBlocks] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [{ blocks: items }, headers] = await Promise.all([api<{ blocks: BlockedUser[] }>("/safety/blocks"), getMediaHeaders()]);
      setBlocks(items.map((item) => ({ ...item, photo: item.photo ? { ...item.photo, headers } : null })));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Blocked accounts could not be loaded"); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const unblock = async (userId: string) => {
    try { await api(`/safety/block/${userId}`, { method: "DELETE" }); setBlocks((items) => items.filter((item) => item.userId !== userId)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Account could not be unblocked"); }
  };
  return <Screen>
    <AccessibleText variant="title" weight="800">Blocked accounts</AccessibleText>
    <AccessibleText color={colors.muted}>Blocked people cannot discover, match, or message you. Unblocking does not restore a previous match.</AccessibleText>
    {loading ? <Card><AccessibleText>Loading…</AccessibleText></Card> : null}
    {error ? <Card><AccessibleText color={colors.error}>{error}</AccessibleText></Card> : null}
    {!loading && blocks.length === 0 ? <Card><AccessibleText>You have not blocked anyone.</AccessibleText></Card> : null}
    {blocks.map((block) => <Card key={block.id} style={{ flexDirection: "row", alignItems: "center" }}>
      {block.photo ? <Image accessibilityLabel={block.photo.altText ?? "Profile photo"} source={{ uri: block.photo.url, headers: block.photo.headers }} style={{ width: 56, height: 56, borderRadius: radius.pill }} /> : <View style={{ width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.softBlue }} />}
      <View style={{ flex: 1, gap: spacing.xs }}><AccessibleText weight="800">{block.displayName}</AccessibleText><AccessibleText variant="caption" color={colors.muted}>Blocked {new Date(block.createdAt).toLocaleDateString()}</AccessibleText></View>
      <Button label="Unblock" variant="secondary" onPress={() => void unblock(block.userId)} />
    </Card>)}
  </Screen>;
}
