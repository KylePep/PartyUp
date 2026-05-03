import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, type CurrentUser } from "../api/endpoints/auth";
import { UnauthorizedError } from "../api/client";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unreachable" };

export function useAuth(): AuthState {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/");
      return;
    }

    getMe()
      .then((user) => setState({ status: "authenticated", user }))
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          // Token invalid or expired — send back to landing
          navigate("/");
        } else {
          // Network error / API down — stay on page, show error state
          setState({ status: "unreachable" });
        }
      });
  }, [navigate]);

  return state;
}
