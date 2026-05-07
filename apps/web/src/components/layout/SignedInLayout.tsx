import { useState, type ReactNode } from "react";
import { Outlet, Navigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NavBar } from "./NavBar";
import { Footer } from "./Footer";
import { FullScreenStatus } from "./FullScreenStatus";
import { SignOutButton } from "../ui/SignOutButton";

export type SignedInLayoutContext = {
  setNavExtra: (node: ReactNode) => void;
};

export default function SignedInLayout() {
  const { state: auth } = useAuth();
  const [navExtra, setNavExtra] = useState<ReactNode>(null);

  if (auth.status === "loading") return <FullScreenStatus type="loading" />;
  if (auth.status === "unauthenticated") return <Navigate to="/" replace />;
  if (auth.status === "unreachable")
    return <FullScreenStatus type="unreachable" onRetry={() => window.location.reload()} />;

  const { username } = auth.user;

  return (
    <div
      className="min-h-screen bg-brand-bg text-brand-text flex flex-col"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <NavBar
        rightSlot={
          <>
            {navExtra}
            <span className="font-mono text-[11px] text-brand-muted tracking-widest uppercase hidden sm:block">
              {username}
            </span>
            <SignOutButton />
          </>
        }
      />
      <Outlet context={{ setNavExtra } satisfies SignedInLayoutContext} />
      <Footer />
    </div>
  );
}

export function useSignedInLayout() {
  return useOutletContext<SignedInLayoutContext>();
}
