import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ChoiceChip } from "../components/ChoiceChip";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import type { RootStackParams } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { ChatMessage, ConversationUpdate } from "../types";

const categories = [
  ["HARASSMENT", "Harassment"], ["SPAM", "Spam"], ["FAKE_PROFILE", "Fake profile"],
  ["INAPPROPRIATE_CONTENT", "Inappropriate content"], ["HATE_OR_DISCRIMINATION", "Hate or discrimination"],
  ["UNSAFE_BEHAVIOR", "Unsafe behavior"], ["OTHER", "Other"],
] as const;

export function SafetyActionsScreen({ route, navigation }: NativeStackScreenProps<RootStackParams, "SafetyActions">) {
  const { matchId, userId, name } = route.params;
  const [category, setCategory] = useState<(typeof categories)[number][0]>("UNSAFE_BEHAVIOR");
  const [details, setDetails] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [blockWithReport, setBlockWithReport] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void api<ConversationUpdate>(`/messages/matches/${matchId}`)
      .then((response) => setMessages(response.messages.filter((message) => message.senderId === userId).slice(-10)))
      .catch(() => undefined);
  }, [matchId, userId]);

  const toggleEvidence = (id: string) => setEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const leaveConversation = () => navigation.navigate("Main");

  const unmatch = () => Alert.alert("Unmatch?", `This ends your conversation with ${name}.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Unmatch", style: "destructive", onPress: () => { setBusy(true); void api(`/matches/${matchId}`, { method: "DELETE" }).then(leaveConversation).catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Could not unmatch")).finally(() => setBusy(false)); } },
  ]);

  const block = () => Alert.alert("Block this account?", "They will not be notified. The match and conversation will end immediately.", [
    { text: "Cancel", style: "cancel" },
    { text: "Block", style: "destructive", onPress: () => { setBusy(true); void api("/safety/block", { method: "POST", body: JSON.stringify({ userId }) }).then(leaveConversation).catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Could not block account")).finally(() => setBusy(false)); } },
  ]);

  const report = async () => {
    setBusy(true); setNotice(null);
    try {
      await api("/safety/report", { method: "POST", body: JSON.stringify({ userId, matchId, category, details: details || null, evidenceMessageIds: evidence, block: blockWithReport }) });
      setNotice("Your report was submitted. Thank you for helping keep Spectrum safer.");
      if (blockWithReport) leaveConversation();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Report could not be submitted"); }
    finally { setBusy(false); }
  };

  return <Screen>
    <AccessibleText variant="title" weight="800">Safety options for {name}</AccessibleText>
    <Card><AccessibleText weight="800">Plan a safer date</AccessibleText><AccessibleText color={colors.muted}>Save trusted-contact details or schedule a private check-in. Spectrum is not an emergency service.</AccessibleText><Button label="Open safety center" variant="secondary" onPress={() => navigation.navigate("SafetyCenter", { matchId, name })} /></Card>
    <Card><AccessibleText weight="800">End contact</AccessibleText><Button label="Unmatch" variant="secondary" disabled={busy} onPress={unmatch} /><Button label="Block account" variant="danger" disabled={busy} onPress={block} /></Card>
    <Card>
      <AccessibleText weight="800">Report a concern</AccessibleText>
      <AccessibleText color={colors.muted}>Reports are private and reviewed by authorized moderators.</AccessibleText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{categories.map(([value, label]) => <ChoiceChip key={value} label={label} selected={category === value} onPress={() => setCategory(value)} />)}</View>
      <Input accessibilityLabel="Report details" multiline maxLength={3000} placeholder="Share what happened (optional)" value={details} onChangeText={setDetails} style={{ minHeight: 112, textAlignVertical: "top", paddingTop: spacing.md }} />
      {messages.length ? <><AccessibleText weight="800">Include recent messages (optional)</AccessibleText>{messages.map((message) => <ChoiceChip key={message.id} label={message.body.length > 80 ? `${message.body.slice(0, 80)}…` : message.body} selected={evidence.includes(message.id)} onPress={() => toggleEvidence(message.id)} />)}</> : null}
      <ChoiceChip label="Block after reporting" selected={blockWithReport} onPress={() => setBlockWithReport((value) => !value)} />
      <Button label={busy ? "Submitting…" : "Submit report"} disabled={busy} onPress={() => void report()} />
    </Card>
    {notice ? <Card accessibilityLiveRegion="polite"><AccessibleText color={notice.startsWith("Your report") ? colors.success : colors.error}>{notice}</AccessibleText></Card> : null}
  </Screen>;
}
