import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api/endpoints/auth";
import { Modal } from "./Modal";

type Mode = "sign-in" | "sign-up";

interface Props {
  initialMode: Mode;
  onClose: () => void;
}

export default function AuthModal({ initialMode, onClose }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      if (mode === "sign-up") {
        await register(username, password);

        const token = await login(username, password);

        localStorage.setItem("token", token);
      } else {
        const token = await login(username, password);

        localStorage.setItem("token", token);
      }

      localStorage.setItem("username", username);

      setSuccess(true);

      setTimeout(() => navigate("/home"), 800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      titleId="auth-modal-title"
    >
      <div className="p-8">
        {success ? (
          <div className="text-center py-6">
            <p className="font-display text-brand-gold text-xl tracking-wide mb-2">
              Welcome, {username}
            </p>

            <p className="text-brand-muted text-sm">
              Entering the realm...
            </p>
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="text-center mb-8">
              <h2
                id="auth-modal-title"
                className="font-display text-brand-gold text-2xl tracking-wide"
              >
                {mode === "sign-in"
                  ? "Welcome Back"
                  : "Join the Realm"}
              </h2>

              <p className="text-brand-muted text-sm mt-2">
                {mode === "sign-in"
                  ? "Sign in to continue your adventure."
                  : "Create your account and begin your quest."}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-brand-border mb-8">
              {(["sign-in", "sign-up"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 pb-3 text-sm font-body transition-colors ${mode === m
                      ? "border-b-2 border-brand-gold text-brand-gold -mb-px"
                      : "text-brand-muted hover:text-brand-text"
                    }`}
                >
                  {m === "sign-in" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="auth-username"
                  className="block text-brand-muted text-xs uppercase tracking-widest mb-2 font-display"
                >
                  Username
                </label>

                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full bg-brand-surface-raised border border-brand-border text-brand-text px-4 py-3 text-sm focus:outline-none focus:border-brand-gold transition-colors placeholder:text-brand-muted/50"
                  placeholder="Your username"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-brand-muted text-xs uppercase tracking-widest mb-2 font-display"
                >
                  Password
                </label>

                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={
                    mode === "sign-up"
                      ? "new-password"
                      : "current-password"
                  }
                  className="w-full bg-brand-surface-raised border border-brand-border text-brand-text px-4 py-3 text-sm focus:outline-none focus:border-brand-gold transition-colors placeholder:text-brand-muted/50"
                  placeholder="Your password"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-brand-crimson text-sm border border-brand-crimson/30 bg-brand-crimson/10 px-3 py-2"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-gold text-brand-bg font-display font-semibold py-3 tracking-wide hover:bg-brand-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "..."
                  : mode === "sign-in"
                    ? "Enter the Realm"
                    : "Forge Your Legend"}
              </button>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}
