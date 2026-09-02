import { useEffect, useRef, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Crypto from "expo-crypto";
import { Pressable, View } from "react-native";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import type { ChatMessage, ConversationUpdate } from "../types";
import type { RootStackParams } from "../navigation/AppNavigator";

const suggestions = ["Can you clarify what you meant?", "I’m interested, but I need a little time to respond.", "That sounds good. Can we make a specific plan?"];

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const messages = new Map(current.map((message) => [message.clientId ?? message.id, message]));
  for (const message of incoming) messages.set(message.clientId ?? message.id, message);
  return [...messages.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
}

export function ChatScreen({ route, navigation }: NativeStackScreenProps<RootStackParams, "Chat">) {
  const { matchId, userId: otherUserId, name } = route.params;
  const currentUserId = useAppStore((state) => state.user?.id);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursor = useRef<string | null>(null);
  const typingAt = useRef<string | null>(null);
  const readAt = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    let typingTimer: ReturnType<typeof setTimeout> | null = null;
    const applyUpdate = async (update: ConversationUpdate) => {
      if (!active) return;
      cursor.current = update.cursor;
      if (update.typing) {
        typingAt.current = update.typing.updatedAt;
        setOtherTyping(update.typing.active);
        if (typingTimer) clearTimeout(typingTimer);
        const delay = Math.max(0, new Date(update.typing.expiresAt).getTime() - Date.now());
        typingTimer = setTimeout(() => setOtherTyping(false), delay);
      }
      if (update.readReceipt) {
        readAt.current = update.readReceipt.at;
        setMessages((current) => current.map((message) => message.senderId === currentUserId && message.createdAt <= update.readReceipt!.through ? { ...message, readAt: update.readReceipt!.at } : message));
      }
      if (update.messages.length) {
        setMessages((current) => mergeMessages(current, update.messages));
        if (update.messages.some((message) => message.senderId === otherUserId && !message.readAt)) {
          await api(`/messages/matches/${matchId}/read`, { method: "POST" }).catch(() => undefined);
        }
      }
    };
    const run = async () => {
      try {
        const initial = await api<ConversationUpdate>(`/messages/matches/${matchId}`);
        await applyUpdate(initial);
        await api(`/messages/matches/${matchId}/read`, { method: "POST" });
        if (active) setLoading(false);
        while (active) {
          controller = new AbortController();
          const query = [
            cursor.current ? `cursor=${encodeURIComponent(cursor.current)}` : null,
            typingAt.current ? `typingAt=${encodeURIComponent(typingAt.current)}` : null,
            readAt.current ? `readAt=${encodeURIComponent(readAt.current)}` : null,
            "timeoutMs=20000",
          ].filter(Boolean).join("&");
          try {
            const update = await api<ConversationUpdate>(`/messages/matches/${matchId}/updates?${query}`, { signal: controller.signal });
            await applyUpdate(update);
            if (active) setError(null);
          } catch (caught) {
            if (!active) return;
            setError(caught instanceof Error ? caught.message : "Live updates paused");
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      } catch (caught) {
        if (active) { setLoading(false); setError(caught instanceof Error ? caught.message : "Conversation could not be loaded"); }
      }
    };
    void run();
    return () => {
      active = false;
      controller?.abort();
      if (typingTimer) clearTimeout(typingTimer);
      void api(`/messages/matches/${matchId}/typing`, { method: "PUT", body: JSON.stringify({ active: false }) }).catch(() => undefined);
    };
  }, [currentUserId, matchId, otherUserId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void api(`/messages/matches/${matchId}/typing`, { method: "PUT", body: JSON.stringify({ active: Boolean(draft.trim()) }) }).catch(() => undefined);
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, matchId]);

  const sendMessage = async (body: string, clientId = Crypto.randomUUID()) => {
    if (!currentUserId || !body.trim()) return;
    const optimistic: ChatMessage = {
      id: clientId, clientId, matchId, senderId: currentUserId, body: body.trim(), readAt: null,
      createdAt: new Date().toISOString(), pending: true,
    };
    setMessages((current) => mergeMessages(current.filter((message) => message.clientId !== clientId), [optimistic]));
    setDraft(""); setSending(true); setError(null);
    try {
      const { message } = await api<{ message: ChatMessage }>(`/messages/matches/${matchId}`, {
        method: "POST", body: JSON.stringify({ clientId, body: body.trim() }),
      });
      setMessages((current) => mergeMessages(current.filter((item) => item.clientId !== clientId), [message]));
    } catch (caught) {
      setMessages((current) => current.map((message) => message.clientId === clientId ? { ...message, pending: false, failed: true } : message));
      setError(caught instanceof Error ? caught.message : "Message could not be sent");
    } finally { setSending(false); }
  };

  return <Screen>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <View style={{ flex: 1 }}><AccessibleText variant="title" weight="800">{name}</AccessibleText>{otherTyping ? <AccessibleText accessibilityLiveRegion="polite" color={colors.primary}>Typing…</AccessibleText> : null}</View>
      <Button label="Safety" variant="quiet" onPress={() => navigation.navigate("SafetyActions", { matchId, userId: otherUserId, name })} />
    </View>
    <Card><AccessibleText color={colors.muted}>Conversation starters</AccessibleText>{suggestions.map((item) => <Pressable key={item} onPress={() => setDraft(item)}><AccessibleText color={colors.primary} weight="700">{item}</AccessibleText></Pressable>)}</Card>
    {loading ? <Card><AccessibleText>Loading conversation…</AccessibleText></Card> : null}
    {error ? <AccessibleText accessibilityRole="alert" color={colors.error}>{error}</AccessibleText> : null}
    <View style={{ gap: spacing.sm }}>{messages.map((message) => {
      const own = message.senderId === currentUserId;
      return <Pressable key={message.clientId ?? message.id} disabled={!message.failed} onPress={() => message.failed ? void sendMessage(message.body, message.clientId ?? Crypto.randomUUID()) : undefined} style={{ alignSelf: own ? "flex-end" : "flex-start", maxWidth: "85%" }}>
        <View style={{ backgroundColor: own ? colors.primary : colors.surface, borderColor: own ? colors.primary : colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs }}>
          <AccessibleText color={own ? colors.surface : colors.text}>{message.body}</AccessibleText>
          <AccessibleText variant="caption" color={own ? colors.surface : colors.muted}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{own ? message.pending ? " · Sending" : message.failed ? " · Failed — tap to retry" : message.readAt ? " · Read" : " · Sent" : ""}</AccessibleText>
        </View>
      </Pressable>;
    })}</View>
    <Input accessibilityLabel="Message" multiline maxLength={5000} placeholder="Write a clear, kind message" value={draft} onChangeText={setDraft} style={{ minHeight: 96, textAlignVertical: "top", paddingTop: spacing.md }} />
    <Button label={sending ? "Sending…" : "Send"} disabled={sending || !draft.trim()} onPress={() => void sendMessage(draft)} />
  </Screen>;
}
