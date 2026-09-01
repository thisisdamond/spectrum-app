import { AccessibleText } from "../components/AccessibleText";
import { Card } from "../components/Card";
import { Screen } from "../components/Screen";

const makeScreen = (title: string, description: string) => function PlaceholderScreen() { return <Screen><AccessibleText variant="title" weight="800">{title}</AccessibleText><Card><AccessibleText>{description}</AccessibleText></Card></Screen>; };

export const ProfileSetupScreen = makeScreen("Build your profile", "Add only what you are comfortable sharing.");
export const PreferencesSetupScreen = makeScreen("Who you’d like to meet", "Preferences are adjustable and private.");
export const CommunicationStyleScreen = makeScreen("Communication style", "Choose directness, response pace, and planning preferences.");
export const SensoryPreferencesScreen = makeScreen("Sensory preferences", "Describe environments that help dates feel comfortable.");
export const PhotoUploadScreen = makeScreen("Add photos", "Up to four photos, with optional alt text.");
export const PromptSetupScreen = makeScreen("Prompts", "Share the details that make conversation easier.");
export const SubscriptionScreen = makeScreen("Spectrum Premium", "Unlimited likes, backtrack, and advanced filters—without pressure badges.");
export const SafetyCenterScreen = makeScreen("Safety center", "Block, report, unmatch, and review clear community expectations.");
export const ReportUserScreen = makeScreen("Report a concern", "Reports are private and reviewed by the safety team.");
export const BlockedUsersScreen = makeScreen("Blocked users", "Blocked people cannot see or contact you.");
