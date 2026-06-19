import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as signalR from "@microsoft/signalr";
import { getMe, type CurrentUser } from "../api/endpoints/auth";
import { UnauthorizedError, API_BASE } from "../api/client";
import { useNotifications, type MatchNotificationPayload } from "./NotificationContext";
import { useStickerContext, type StickerNotificationPayload } from "./StickerContext";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unreachable" }
  | { status: "unauthenticated" };

type AuthContextValue = {
  state: AuthState;
  login: (email: string, token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const HUB_URL = API_BASE.replace(/\/api$/, "") + "/hubs/notifications";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    localStorage.getItem("token") ? { status: "loading" } : { status: "unauthenticated" }
  );
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const { push } = useNotifications();
  const { pushSticker, pushToast } = useStickerContext();

  function startConnection(token: string) {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    connection.on("NewMatch", (payload: MatchNotificationPayload) => {
      push(payload);
    });

    connection.on("NewSticker", (payload: StickerNotificationPayload) => {
      pushSticker({
        id: payload.id,
        matchId: payload.matchId,
        senderCharacterId: payload.senderCharacterId,
        emoji: payload.emoji,
        sentAt: payload.sentAt,
      });
      pushToast({
        senderCharacterName: payload.senderCharacterName,
        emoji: payload.emoji,
      });
    });

    connection.start().catch(() => {
      // SignalR connection failure is non-fatal — badges still populate from DB on next load
    });

    connectionRef.current = connection;
  }

  function stopConnection() {
    connectionRef.current?.stop();
    connectionRef.current = null;
  }

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("token");
    if (!token) return;

    getMe()
      .then((user) => {
        if (cancelled) return;
        setState({ status: "authenticated", user });
        startConnection(token);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof UnauthorizedError) {
          setState({ status: "unauthenticated" });
        } else {
          setState({ status: "unreachable" });
        }
      });

    return () => {
      cancelled = true;
      stopConnection();
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      stopConnection();
      setState({ status: "unauthenticated" });
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  async function login(_email: string, token: string) {
    localStorage.setItem("token", token);
    try {
      const user = await getMe();
      setState({ status: "authenticated", user });
      startConnection(token);
    } catch (err) {
      localStorage.removeItem("token");
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setState({ status: "unauthenticated" });
    stopConnection();
  }

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
