import { useState } from "react";
import { login, register } from "../api/endpoints/auth";

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

  async function handleSubmit(e: React.FormEvent) {
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
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-brand-surface border border-brand-border w-full max-w-md">
        {/* Decorative top bar */}
        <div className="h-px bg-gradient-to-r from-transparent via-brand-gold to-transparent" />

        <div className="p-8">
          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="font-display text-brand-gold text-2xl tracking-wide">
              {mode === "sign-in" ? "Welcome Back" : "Join the Realm"}
            </h2>
            <p className="text-brand-muted text-sm mt-2">
              {mode === "sign-in"
                ? "Sign in to continue your adventure."
                : "Create your account and begin your quest."}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-brand-border mb-8">
            {(["sign-in", "sign-up"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 pb-3 text-sm font-body transition-colors ${
                  mode === m
                    ? "border-b-2 border-brand-gold text-brand-gold -mb-px"
                    : "text-brand-muted hover:text-brand-text"
                }`}
              >
                {m === "sign-in" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-brand-muted text-xs uppercase tracking-widest mb-2 font-display">
                Username
              </label>
              <input
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
              <label className="block text-brand-muted text-xs uppercase tracking-widest mb-2 font-display">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                className="w-full bg-brand-surface-raised border border-brand-border text-brand-text px-4 py-3 text-sm focus:outline-none focus:border-brand-gold transition-colors placeholder:text-brand-muted/50"
                placeholder="Your password"
              />
            </div>

            {error && (
              <p className="text-brand-crimson text-sm border border-brand-crimson/30 bg-brand-crimson/10 px-3 py-2">
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
        </div>

        {/* Decorative bottom bar */}
        <div className="h-px bg-gradient-to-r from-transparent via-brand-border to-transparent" />
      </div>
    </div>
  );
}
