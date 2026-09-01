import { useState } from "react";
import { Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AccessibleText } from "../components/AccessibleText";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ChoiceChip } from "../components/ChoiceChip";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { api, uploadPhotoBinary } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { colors } from "../theme/colors";
import type { DatingGoal, Preferences, ProfilePhoto } from "../types";
import type { SetupStackParams } from "../navigation/AppNavigator";

const goals: Array<{ value: DatingGoal; label: string }> = [
  { value: "LONG_TERM", label: "Long-term relationship" },
  { value: "LIFE_PARTNER", label: "Life partner" },
  { value: "FRIENDSHIP_FIRST", label: "Friendship first" },
  { value: "SHORT_TERM", label: "Short-term dating" },
  { value: "EXPLORING", label: "Exploring" },
];
const communicationOptions = ["Direct and clear", "Gentle and gradual", "Text before calls", "Plan ahead", "Extra processing time", "Regular check-ins"];
const sensoryOptions = ["Quiet spaces", "Low lighting", "Low scent", "Predictable plans", "Outdoor space", "Easy exit option"];
const environmentOptions = ["Quiet café", "Museum", "Park", "Bookshop", "At-home activity", "Low-key restaurant"];
const genderOptions = ["Women", "Men", "Nonbinary people", "Gender-expansive people"];

function StepHeading({ step, title, description }: { step: number; title: string; description: string }) {
  return <><AccessibleText variant="caption" color={colors.primary} weight="700">PROFILE SETUP · STEP {step} OF 6</AccessibleText><AccessibleText variant="title" weight="800">{title}</AccessibleText><AccessibleText color={colors.muted}>{description}</AccessibleText></>;
}

function FormError({ value }: { value: string | null }) {
  return value ? <AccessibleText accessibilityRole="alert" color={colors.error}>{value}</AccessibleText> : null;
}

function Choices({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{options.map((option) => <ChoiceChip key={option} label={option} selected={selected.includes(option)} onPress={() => onToggle(option)} />)}</View>;
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function BasicProfileSetupScreen({ navigation }: NativeStackScreenProps<SetupStackParams, "Basics">) {
  const saveProfile = useAppStore((state) => state.saveProfile);
  const existing = useAppStore((state) => state.profile);
  const [displayName, setDisplayName] = useState(existing?.displayName ?? "");
  const [birthDate, setBirthDate] = useState(existing?.birthDate?.slice(0, 10) ?? "");
  const [gender, setGender] = useState(existing?.gender ?? "");
  const [pronouns, setPronouns] = useState(existing?.pronouns ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [datingGoal, setDatingGoal] = useState<DatingGoal>(existing?.datingGoal ?? "LONG_TERM");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await saveProfile({ displayName, birthDate: new Date(`${birthDate}T12:00:00.000Z`).toISOString(), gender, pronouns: pronouns || null, city: city || null, datingGoal, bio: bio || null }, Boolean(existing));
      navigation.navigate("Preferences");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Profile could not be saved"); }
    finally { setBusy(false); }
  };
  return <Screen><StepHeading step={1} title="The basics" description="Share only what helps someone recognize and understand you." /><Card><AccessibleText weight="700">Name shown on your profile</AccessibleText><Input accessibilityLabel="Display name" placeholder="Display name" value={displayName} onChangeText={setDisplayName} /><AccessibleText weight="700">Birth date</AccessibleText><Input accessibilityLabel="Birth date in year month day format" placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" value={birthDate} onChangeText={setBirthDate} /><AccessibleText weight="700">Gender</AccessibleText><Input accessibilityLabel="Gender" placeholder="Use your own words" value={gender} onChangeText={setGender} /><AccessibleText weight="700">Pronouns (optional)</AccessibleText><Input accessibilityLabel="Pronouns" placeholder="For example: they/them" value={pronouns} onChangeText={setPronouns} /><AccessibleText weight="700">City (optional)</AccessibleText><Input accessibilityLabel="City" placeholder="City" value={city} onChangeText={setCity} /><AccessibleText weight="700">What are you looking for?</AccessibleText><View style={{ gap: 8 }}>{goals.map((goal) => <ChoiceChip key={goal.value} label={goal.label} selected={datingGoal === goal.value} onPress={() => setDatingGoal(goal.value)} />)}</View><AccessibleText weight="700">A little about you (optional)</AccessibleText><Input accessibilityLabel="Profile bio" multiline maxLength={1200} placeholder="What would make a good match feel at ease?" value={bio} onChangeText={setBio} style={{ minHeight: 112, textAlignVertical: "top", paddingTop: 14 }} /></Card><FormError value={error} /><Button label={busy ? "Saving…" : "Continue"} disabled={busy || !displayName || !birthDate || !gender} onPress={submit} /></Screen>;
}

export function PreferencesSetupScreen({ navigation }: NativeStackScreenProps<SetupStackParams, "Preferences">) {
  const save = useAppStore((state) => state.savePreferences);
  const existing = useAppStore((state) => state.preferences);
  const [minAge, setMinAge] = useState(String(existing?.minAge ?? 18));
  const [maxAge, setMaxAge] = useState(String(existing?.maxAge ?? 45));
  const [distance, setDistance] = useState(String(existing?.maxDistanceKm ?? 80));
  const [genders, setGenders] = useState(existing?.interestedInGenders ?? []);
  const [selectedGoals, setSelectedGoals] = useState<DatingGoal[]>(existing?.datingGoals ?? ["LONG_TERM"]);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setError(null);
    const input: Preferences = {
      minAge: Number(minAge), maxAge: Number(maxAge), maxDistanceKm: Number(distance), interestedInGenders: genders, datingGoals: selectedGoals,
      drinking: existing?.drinking ?? "MODERATE", smoking: existing?.smoking ?? "AVOID", cannabis: existing?.cannabis ?? "MODERATE",
      communicationStyles: existing?.communicationStyles ?? [], sensoryPreferences: existing?.sensoryPreferences ?? [], socialEnergyTarget: existing?.socialEnergyTarget ?? 50,
      routineTarget: existing?.routineTarget ?? 50, dateEnvironments: existing?.dateEnvironments ?? [], desiredPace: existing?.desiredPace ?? 50, hardBoundaries: existing?.hardBoundaries ?? [],
    };
    try { await save(input); navigation.navigate("Communication"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Preferences could not be saved"); }
  };
  return <Screen><StepHeading step={2} title="Who you’d like to meet" description="These preferences are private, adjustable, and used only for filtering and compatibility." /><Card><AccessibleText weight="700">Age range</AccessibleText><View style={{ flexDirection: "row", gap: 8 }}><Input accessibilityLabel="Minimum age" keyboardType="number-pad" value={minAge} onChangeText={setMinAge} style={{ flex: 1 }} /><Input accessibilityLabel="Maximum age" keyboardType="number-pad" value={maxAge} onChangeText={setMaxAge} style={{ flex: 1 }} /></View><AccessibleText weight="700">Maximum distance in kilometers</AccessibleText><Input accessibilityLabel="Maximum distance in kilometers" keyboardType="number-pad" value={distance} onChangeText={setDistance} /><AccessibleText weight="700">I’m interested in</AccessibleText><Choices options={genderOptions} selected={genders} onToggle={(value) => setGenders(toggle(genders, value))} /><AccessibleText weight="700">Compatible dating goals</AccessibleText><View style={{ gap: 8 }}>{goals.map((goal) => <ChoiceChip key={goal.value} label={goal.label} selected={selectedGoals.includes(goal.value)} onPress={() => setSelectedGoals(toggle(selectedGoals, goal.value) as DatingGoal[])} />)}</View></Card><FormError value={error} /><Button label="Continue" disabled={!genders.length || !selectedGoals.length} onPress={submit} /></Screen>;
}

export function CommunicationSetupScreen({ navigation }: NativeStackScreenProps<SetupStackParams, "Communication">) {
  const save = useAppStore((state) => state.saveProfile);
  const profile = useAppStore((state) => state.profile);
  const [styles, setStyles] = useState(profile?.communicationStyle ?? []);
  const [planning, setPlanning] = useState(profile?.communicationCard?.planning ?? "");
  const [responsePace, setResponsePace] = useState(profile?.communicationCard?.responsePace ?? "");
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setError(null);
    try { await save({ communicationStyle: styles, communicationCard: { planning, responsePace } }, true); navigation.navigate("Sensory"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Communication preferences could not be saved"); }
  };
  return <Screen><StepHeading step={3} title="Communication that works for you" description="This becomes a shareable communication card. It is preference information, not a diagnosis." /><Card><Choices options={communicationOptions} selected={styles} onToggle={(value) => setStyles(toggle(styles, value))} /><AccessibleText weight="700">Planning helps when…</AccessibleText><Input accessibilityLabel="Planning preference" placeholder="For example: I like one day of notice" value={planning} onChangeText={setPlanning} /><AccessibleText weight="700">My response pace can look like…</AccessibleText><Input accessibilityLabel="Response pace preference" placeholder="For example: I may need time to process" value={responsePace} onChangeText={setResponsePace} /></Card><FormError value={error} /><Button label="Continue" disabled={!styles.length} onPress={submit} /></Screen>;
}

export function SensorySetupScreen({ navigation }: NativeStackScreenProps<SetupStackParams, "Sensory">) {
  const save = useAppStore((state) => state.saveProfile);
  const profile = useAppStore((state) => state.profile);
  const [sensory, setSensory] = useState(profile?.sensoryPreferences ?? []);
  const [environments, setEnvironments] = useState(profile?.preferredDateEnvironments ?? []);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setError(null);
    try { await save({ sensoryPreferences: sensory, preferredDateEnvironments: environments }, true); navigation.navigate("Photos"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Sensory preferences could not be saved"); }
  };
  return <Screen><StepHeading step={4} title="Comfortable environments" description="Choose what makes meeting someone easier. Matches see only what you decide to share." /><Card><AccessibleText weight="700">Sensory supports</AccessibleText><Choices options={sensoryOptions} selected={sensory} onToggle={(value) => setSensory(toggle(sensory, value))} /><AccessibleText weight="700">Date environments I enjoy</AccessibleText><Choices options={environmentOptions} selected={environments} onToggle={(value) => setEnvironments(toggle(environments, value))} /></Card><FormError value={error} /><Button label="Continue" disabled={!sensory.length || !environments.length} onPress={submit} /></Screen>;
}

export function PhotosSetupScreen({ navigation }: NativeStackScreenProps<SetupStackParams, "Photos">) {
  const photos = useAppStore((state) => state.photos);
  const addPhoto = useAppStore((state) => state.addPhoto);
  const refreshProfile = useAppStore((state) => state.refreshProfile);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const choosePhoto = async () => {
    setBusy(true); setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 5], quality: 0.9 });
      if (result.canceled) return;
      const asset = result.assets[0]!;
      const mimeType = asset.mimeType ?? "image/jpeg";
      const sizeBytes = asset.fileSize ?? (await (await fetch(asset.uri)).blob()).size;
      const { upload } = await api<{ upload: { storageKey: string; uploadUrl: string } }>("/profile/photos/upload-url", { method: "POST", body: JSON.stringify({ mimeType, sizeBytes }) });
      await uploadPhotoBinary(upload.uploadUrl, asset.uri, mimeType);
      const position = [0, 1, 2, 3].find((candidate) => !photos.some((photo) => photo.position === candidate));
      if (position === undefined) throw new Error("A profile can have up to four photos");
      const { photo } = await api<{ photo: ProfilePhoto }>("/profile/photos", { method: "POST", body: JSON.stringify({ storageKey: upload.storageKey, mimeType, sizeBytes, position, altText: null }) });
      setPreview(asset.uri); addPhoto(photo); await refreshProfile();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Photo could not be added"); }
    finally { setBusy(false); }
  };
  return <Screen><StepHeading step={5} title="Add a profile photo" description="Choose up to four photos. Files stay private and are delivered through short-lived access links." /><Card>{preview ? <Image accessibilityLabel="Selected profile photo" source={{ uri: preview }} style={{ width: "100%", aspectRatio: 4 / 5, borderRadius: 16 }} /> : null}<AccessibleText>{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} added` : "Add at least one photo to continue."}</AccessibleText><Button label={busy ? "Uploading…" : "Choose a photo"} variant="secondary" disabled={busy || photos.length >= 4} onPress={choosePhoto} /></Card><FormError value={error} /><Button label="Continue" disabled={!photos.length} onPress={() => navigation.navigate("Prompts")} /></Screen>;
}

const promptOptions = ["A comfortable first date for me is…", "Something I can talk about for hours…", "The clearest way to communicate with me is…", "A small thing that makes me happy…"];

export function PromptsSetupScreen({ navigation }: NativeStackScreenProps<SetupStackParams, "Prompts">) {
  const addPrompt = useAppStore((state) => state.addPrompt);
  const prompts = useAppStore((state) => state.prompts);
  const [promptKey, setPromptKey] = useState(promptOptions[0]!);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const position = [0, 1, 2].find((candidate) => !prompts.some((prompt) => prompt.position === candidate));
      if (position === undefined) throw new Error("A profile can have up to three prompts");
      await addPrompt({ promptKey, answer, position }); navigation.getParent()?.goBack(); setBusy(false);
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Prompt could not be saved"); setBusy(false); }
  };
  return <Screen><StepHeading step={6} title="Make conversation easier" description="A prompt gives matches a specific, lower-pressure place to begin." /><Card><AccessibleText weight="700">Choose a prompt</AccessibleText><View style={{ gap: 8 }}>{promptOptions.map((prompt) => <ChoiceChip key={prompt} label={prompt} selected={promptKey === prompt} onPress={() => setPromptKey(prompt)} />)}</View><AccessibleText weight="700">Your answer</AccessibleText><Input accessibilityLabel="Prompt answer" multiline maxLength={1000} placeholder="Write an answer that sounds like you" value={answer} onChangeText={setAnswer} style={{ minHeight: 120, textAlignVertical: "top", paddingTop: 14 }} /></Card><FormError value={error} /><Button label={busy ? "Finishing…" : "Finish my profile"} disabled={busy || !answer.trim() || prompts.length >= 3} onPress={submit} /></Screen>;
}
