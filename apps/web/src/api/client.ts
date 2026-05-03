const API_BASE = "http://localhost:5288/api";

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => `API error: ${res.status}`);
    throw new Error(message || `API error: ${res.status}`);
  }

  return res.json();
}
