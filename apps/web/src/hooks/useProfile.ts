import { useState, useEffect } from "react";
import {
  getProfile,
  updateProfile,
  updatePreferences,
  type UpdateProfileRequest,
  type UpdatePreferencesRequest,
} from "../api/endpoints/profileEndpoints";
import type { UserProfileData } from "../api/endpoints/auth";

export function useProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setError("Failed to load profile"))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleUpdateProfile(data: UpdateProfileRequest): Promise<void> {
    const updated = await updateProfile(data);
    setProfile(updated);
  }

  async function handleUpdatePreferences(data: UpdatePreferencesRequest): Promise<void> {
    const updated = await updatePreferences(data);
    setProfile((prev) => (prev ? { ...prev, preferences: updated } : null));
  }

  return {
    profile,
    isLoading,
    error,
    updateProfile: handleUpdateProfile,
    updatePreferences: handleUpdatePreferences,
  };
}
