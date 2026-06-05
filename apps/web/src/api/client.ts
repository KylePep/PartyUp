export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5288/api";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("email");
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearAuth();
    throw new UnauthorizedError();
  }

  if (!res.ok) {
    let message = `API error: ${res.status}`;

    try {
      const text = await res.text();
      if (text) message = text;
    } catch {
      // ignore
    }

    throw new HttpError(res.status, message);
  }

  // Handle no-content responses (204)
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: authHeaders(),
  });

  return handleResponse<T>(res);
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  return handleResponse<T>(res);
}

export async function apiPostEmpty(url: string): Promise<void> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  return handleResponse<T>(res);
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  return handleResponse<T>(res);
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  return handleResponse<T>(res);
}

export async function apiPostForm<T>(url: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  return handleResponse<T>(res);
}

