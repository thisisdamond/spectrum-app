import { useCallback, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { View } from "react-native";
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
import type { DateCheckIn, SafetyPlan } from "../types";

export function SafetyCenterScreen({ route }: NativeStackScreenProps<RootStackParams, "SafetyCenter">) {
  const matchId = route.params?.matchId;
  const matchName = route.params?.name;
  const [contactName, setContactName] = useState("");
  const [contactDetails, setContactDetails] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [label, setLabel] = useState(matchName ? `Date with ${matchName}` : "Date check-in");
  const [venue, setVenue] = useState("");
  const [note, setNote] = useState("");
  const [hours, setHours] = useState(2);
  const [contactRequested, setContactRequested] = useState(false);
  const [checkIns, setCheckIns] = useState<DateCheckIn[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ plan }, { checkIns: items }] = await Promise.all([
        api<{ plan: SafetyPlan | null }>("/safety/plan"), api<{ checkIns: DateCheckIn[] }>("/safety/check-ins"),
      ]);
      if (plan) { setContactName(plan.trustedContactName ?? ""); setContactDetails(plan.trustedContactDetails ?? ""); setPlanNotes(plan.notes ?? ""); }
      setCheckIns(items);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Safety information could not be loaded"); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const savePlan = async () => {
    setBusy(true); setNotice(null);
    try {
      await api("/safety/plan", { method: "PUT", body: JSON.stringify({ trustedContactName: contactName || null, trustedContactDetails: contactDetails || null, notes: planNotes || null }) });
      setNotice("Safety plan saved securely.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Safety plan could not be saved"); }
    finally { setBusy(false); }
  };

  const schedule = async () => {
    setBusy(true); setNotice(null);
    try {
      await api("/safety/check-ins", { method: "POST", body: JSON.stringify({
        matchId: matchId ?? null, label, scheduledFor: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
        venue: venue || null, note: note || null, trustedContactRequested: contactRequested,
      }) });
      setNotice(`Check-in scheduled for ${hours} ${hours === 1 ? "hour" : "hours"} from now.`);
      setVenue(""); setNote(""); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Check-in could not be scheduled"); }
    finally { setBusy(false); }
  };

  const closeCheckIn = async (id: string, action: "check-in" | "cancel") => {
    setBusy(true); setNotice(null);
    try { await api(`/safety/check-ins/${id}/${action}`, { method: "POST" }); await load(); setNotice(action === "check-in" ? "You’re checked in as okay." : "Check-in canceled."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Check-in could not be updated"); }
    finally { setBusy(false); }
  };

  return <Screen>
    <AccessibleText variant="title" weight="800">Safety center</AccessibleText>
    <Card><AccessibleText weight="800">If you’re in immediate danger</AccessibleText><AccessibleText color={colors.muted}>Contact local emergency services or someone you trust. Spectrum check-ins are supportive reminders, not emergency monitoring.</AccessibleText></Card>
    <Card>
      <AccessibleText variant="bodyLarge" weight="800">My private safety plan</AccessibleText>
      <AccessibleText color={colors.muted}>These details are encrypted before storage and shown only to you. A configured safety provider receives them only if you explicitly request trusted-contact escalation and miss a check-in.</AccessibleText>
      <Input accessibilityLabel="Trusted contact name" placeholder="Trusted contact name" value={contactName} onChangeText={setContactName} maxLength={120} />
      <Input accessibilityLabel="Trusted contact phone or email" placeholder="Phone or email" value={contactDetails} onChangeText={setContactDetails} maxLength={300} />
      <Input accessibilityLabel="Safety plan notes" multiline placeholder="What helps me feel safe" value={planNotes} onChangeText={setPlanNotes} maxLength={2000} style={{ minHeight: 100, textAlignVertical: "top", paddingTop: spacing.md }} />
      <Button label={busy ? "Saving…" : "Save safety plan"} disabled={busy} onPress={() => void savePlan()} />
    </Card>
    <Card>
      <AccessibleText variant="bodyLarge" weight="800">Schedule a date check-in</AccessibleText>
      <Input accessibilityLabel="Check-in label" placeholder="Date check-in" value={label} onChangeText={setLabel} maxLength={120} />
      <Input accessibilityLabel="Venue or meeting place" placeholder="Venue (optional)" value={venue} onChangeText={setVenue} maxLength={500} />
      <Input accessibilityLabel="Private check-in note" multiline placeholder="Private note (optional)" value={note} onChangeText={setNote} maxLength={1000} style={{ minHeight: 88, textAlignVertical: "top", paddingTop: spacing.md }} />
      <AccessibleText weight="800">Remind me in</AccessibleText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{[1, 2, 4, 8].map((value) => <ChoiceChip key={value} label={`${value} ${value === 1 ? "hour" : "hours"}`} selected={hours === value} onPress={() => setHours(value)} />)}</View>
      <ChoiceChip label="Alert my trusted contact if I miss the 15-minute check-in window" selected={contactRequested} onPress={() => setContactRequested((value) => !value)} />
      <Button label={busy ? "Scheduling…" : "Schedule check-in"} disabled={busy || !label.trim()} onPress={() => void schedule()} />
    </Card>
    <AccessibleText variant="bodyLarge" weight="800">My check-ins</AccessibleText>
    {checkIns.length === 0 ? <Card><AccessibleText>No check-ins scheduled yet.</AccessibleText></Card> : null}
    {checkIns.map((checkIn) => <Card key={checkIn.id}>
      <AccessibleText weight="800">{checkIn.label}</AccessibleText>
      <AccessibleText color={colors.muted}>{new Date(checkIn.scheduledFor).toLocaleString()} · {checkIn.status.replace("_", " ").toLowerCase()}</AccessibleText>
      {checkIn.venue ? <AccessibleText>Venue: {checkIn.venue}</AccessibleText> : null}
      {checkIn.note ? <AccessibleText>Note: {checkIn.note}</AccessibleText> : null}
      {["SCHEDULED", "MISSED"].includes(checkIn.status) ? <Button label="I’m okay" onPress={() => void closeCheckIn(checkIn.id, "check-in")} disabled={busy} /> : null}
      {checkIn.status === "SCHEDULED" ? <Button label="Cancel check-in" variant="quiet" onPress={() => void closeCheckIn(checkIn.id, "cancel")} disabled={busy} /> : null}
    </Card>)}
    {notice ? <Card accessibilityLiveRegion="polite"><AccessibleText color={notice.includes("could not") || notice.includes("first") ? colors.error : colors.success}>{notice}</AccessibleText></Card> : null}
  </Screen>;
}
