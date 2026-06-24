import { API_BASE } from "../client";

export async function markMatchViewed(matchId: string): Promise<void> {
  const token = localStorage.getItem("token");
  await fetch(`${API_BASE}/match-notifications/${matchId}/viewed`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token ?? ""}`,
    },
  });
}

export async function hasUnreadNotifications(): Promise<boolean> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/match-notifications/has-unread`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.hasUnread;
}
