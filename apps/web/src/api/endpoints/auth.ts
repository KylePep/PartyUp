import { apiPost, apiGet, apiPut } from "../client";

export type UserPreferences = {
  darkMode: boolean;
  notificationsEnabled: boolean;
};

export type UserProfileData = {
  displayName: string | null;
  preferences: UserPreferences;
};

export type CurrentUser = {
  id: string;
  email: string;
  profile: UserProfileData;
};

export async function login(email: string, password: string): Promise<string> {
  const data = await apiPost<{ token: string }>("/auth/login", { email, password });
  return data.token;
}

export async function register(email: string, password: string): Promise<void> {
  await apiPost("/auth/register", { email, password });
}

export async function getMe(): Promise<CurrentUser> {
  return apiGet<CurrentUser>("/auth/me");
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiPut<void>("/auth/password", { currentPassword, newPassword });
}
