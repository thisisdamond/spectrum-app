import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { RootStackParams } from "../navigation/AppNavigator";

const suggestions = ["Can you clarify what you meant?", "I’m interested, but I need a little time to respond.", "That sounds good. Can we make a specific plan?"];

export function ChatScreen({ route }: NativeStackScreenProps<RootStackParams, "Chat">) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const send = () => { if (draft.trim()) { setMessages((items) => [...items, draft.trim()]); setDraft(""); } };
  return (
    <Screen>
      <AccessibleText variant="title" weight="800">{route.params.name}</AccessibleText>
      <Card><AccessibleText color={colors.muted}>Conversation starters</AccessibleText>{suggestions.map((item) => <Pressable key={item} onPress={() => setDraft(item)}><AccessibleText color={colors.primary} weight="700">{item}</AccessibleText></Pressable>)}</Card>
      <View style={{ gap: spacing.sm }}>{messages.map((message, index) => <View key={`${message}-${index}`} style={{ alignSelf: "flex-end", maxWidth: "85%", backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md }}><AccessibleText color={colors.surface}>{message}</AccessibleText></View>)}</View>
      <Input accessibilityLabel="Message" multiline placeholder="Write a clear, kind message" value={draft} onChangeText={setDraft} />
      <Button label="Send" disabled={!draft.trim()} onPress={send} />
    </Screen>
  );
}
