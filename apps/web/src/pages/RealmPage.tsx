import { useNavigate } from "react-router-dom";
import { FullScreenStatus } from "../components/FullScreenStatus";
import { NavBar } from "../components/NavBar";
import { useAuth } from "../hooks/useAuth";

export default function RealmPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  }

  if (auth.status === "loading") {
    return <FullScreenStatus type="loading" />;
  }

  if (auth.status === "unreachable") {
    return (
      <FullScreenStatus
        type="unreachable"
        onRetry={() => window.location.reload()}
        onSignOut={signOut}
      />
    );
  }


  const { username } = auth.user;
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-body flex flex-col">
      <NavBar
        rightSlot={
          <>
            <span className="text-brand-muted text-sm">
              Welcome,{" "}
              <span className="text-brand-text font-display tracking-wide">
                {username}
              </span>
            </span>
            <button
              onClick={signOut}
              className="border border-brand-border text-brand-muted text-sm px-4 py-2 hover:border-brand-gold/60 hover:text-brand-gold transition-colors duration-200 font-display tracking-wider"
            >
              Sign Out
            </button>
          </>
        }
      />

      <main className="flex-1 px-8 py-12 max-w-7xl mx-auto w-full">
        Realm
      </main>
    </div>

  );
}