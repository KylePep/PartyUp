import { useNavigate } from "react-router-dom";

export function SignOutButton() {
  const navigate = useNavigate();

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  }

  return (

    <button
      onClick={signOut}
      className="font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200"
    >
      Sign Out
    </button>
  )
}