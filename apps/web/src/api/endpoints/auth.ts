import { apiPost } from "../client";

export async function login(username: string, password: string): Promise<string> {
  const data = await apiPost<{ token: string }>("/auth/login", { username, password });
  return data.token;
}

export async function register(username: string, password: string): Promise<void> {
  await apiPost("/auth/register", { username, password });
}
