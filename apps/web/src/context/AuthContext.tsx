import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMe, type CurrentUser } from "../api/endpoints/auth";
import { UnauthorizedError } from "../api/client";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unreachable" }
  | { status: "unauthenticated" };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      setState({ status: "unauthenticated" });
      return;
    }
    getMe()
      .then((user) => setState({ status: "authenticated", user }))
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          setState({ status: "unauthenticated" });
        } else {
          setState({ status: "unreachable" });
        }
      });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
