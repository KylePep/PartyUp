import { apiGet, apiPatch } from "../client";
import type { UserProfileData, UserPreferences } from "./auth";

export type UpdateProfileRequest = {
  email?: string;
  displayName?: string;
};

export type UpdatePreferencesRequest = {
  darkMode?: boolean;
  notificationsEnabled?: boolean;
};

export async function getProfile(): Promise<UserProfileData> {
  return apiGet<UserProfileData>("/profile");
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfileData> {
  return apiPatch<UserProfileData>("/profile", data);
}

export async function updatePreferences(data: UpdatePreferencesRequest): Promise<UserPreferences> {
  return apiPatch<UserPreferences>("/profile/preferences", data);
}
