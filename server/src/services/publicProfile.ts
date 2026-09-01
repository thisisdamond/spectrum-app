import { env } from "../config/env.js";
import { createPhotoReadUrl } from "./media.js";
import { ageOnDate } from "./discoveryFilters.js";

type PublicProfileInput = {
  displayName: string;
  birthDate: Date;
  gender: string;
  pronouns: string | null;
  city: string | null;
  region: string | null;
  datingGoal: string;
  bio: string | null;
  interests: string[];
  communicationStyle: string[];
  sensoryPreferences: string[];
  socialEnergy: number;
  routinePreference: number;
  preferredDatingPace: number;
  preferredDateEnvironments: string[];
  boundaries: string[];
  communicationCard: unknown;
};

type PublicPhotoInput = {
  id: string;
  storageKey: string;
  altText: string | null;
  mimeType: string;
  sizeBytes: number;
  position: number;
};

export function publicProfile(profile: PublicProfileInput, now = new Date()) {
  return {
    displayName: profile.displayName,
    age: ageOnDate(profile.birthDate, now),
    gender: profile.gender,
    pronouns: profile.pronouns,
    city: profile.city,
    region: profile.region,
    datingGoal: profile.datingGoal,
    bio: profile.bio,
    interests: profile.interests,
    communicationStyle: profile.communicationStyle,
    sensoryPreferences: profile.sensoryPreferences,
    socialEnergy: profile.socialEnergy,
    routinePreference: profile.routinePreference,
    preferredDatingPace: profile.preferredDatingPace,
    preferredDateEnvironments: profile.preferredDateEnvironments,
    boundaries: profile.boundaries,
    communicationCard: profile.communicationCard,
  };
}

export async function publicPhoto(photo: PublicPhotoInput) {
  const signedUrl = await createPhotoReadUrl(photo.storageKey);
  return {
    id: photo.id,
    altText: photo.altText,
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    position: photo.position,
    url: signedUrl ?? `${env.API_PUBLIC_URL.replace(/\/$/, "")}/profile/photos/${photo.id}/content`,
  };
}
