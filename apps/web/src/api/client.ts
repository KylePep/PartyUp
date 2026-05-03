const API_BASE = "http://localhost:5288/api";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: authHeaders(),
  });

  if (res.status === 401) {
    clearAuth();
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    clearAuth();
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    const message = await res.text().catch(() => `API error: ${res.status}`);
    throw new Error(message || `API error: ${res.status}`);
  }

  return res.json();
}
