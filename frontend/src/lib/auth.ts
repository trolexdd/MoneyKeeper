const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export type User = {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
};

type Credentials = { email: string; password: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new Error("Не удалось связаться с сервером. Проверьте, запущен ли backend.");
  }

  if (!response.ok) {
    let message = "Произошла ошибка. Попробуйте ещё раз.";
    try {
      const body = await response.json();
      const detail = body.detail;
      if (typeof detail === "string") message = detail;
      else if (Array.isArray(detail)) message = detail.map((item: { msg?: string }) => item.msg ?? "").join(" ");
    } catch {
      // Keep the generic message when the response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  login: (credentials: Credentials) =>
    request<AuthSession>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (credentials: Credentials) =>
    request<AuthSession>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  me: (accessToken: string) =>
    request<User>("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),

  refresh: (refreshToken: string) =>
    request<AuthSession>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  logout: (refreshToken: string) =>
    request<void>("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),
};

const ACCESS_KEY = "moneykeeper.access_token";
const REFRESH_KEY = "moneykeeper.refresh_token";

export function saveSession(session: AuthSession) {
  sessionStorage.setItem(ACCESS_KEY, session.access_token);
  sessionStorage.setItem(REFRESH_KEY, session.refresh_token);
}

export function clearSession() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

export async function restoreSession(): Promise<User | null> {
  const accessToken = sessionStorage.getItem(ACCESS_KEY);
  const refreshToken = sessionStorage.getItem(REFRESH_KEY);
  if (!accessToken || !refreshToken) return null;

  try {
    return await authApi.me(accessToken);
  } catch {
    try {
      const refreshed = await authApi.refresh(refreshToken);
      saveSession(refreshed);
      return refreshed.user;
    } catch {
      clearSession();
      return null;
    }
  }
}

export async function signOut() {
  const refreshToken = sessionStorage.getItem(REFRESH_KEY);
  clearSession();
  if (refreshToken) {
    try {
      await authApi.logout(refreshToken);
    } catch {
      // Local session is cleared even if the API is temporarily unavailable.
    }
  }
}
