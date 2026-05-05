import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { NavBar } from "../components/NavBar";
import { Footer } from "../components/Footer";
import { FullScreenStatus } from "../components/FullScreenStatus";
import { useAuth } from "../hooks/useAuth";
import { useUserGames } from "../hooks/useUserGame";
import { createCharacter } from "../api/endpoints/characters";

const PLAYSTYLES = ["Casual", "Competitive", "Hybrid", "Hardcore", "Story-focused"];
const REGIONS = ["NA East", "NA West", "EU", "Asia", "OCE", "SA", "Global"];
const RANKS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Legend", "Mythic"];

export default function CreateCharacterPage() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const auth = useAuth();
  const userGamesHook = useUserGames();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [playstyle, setPlaystyle] = useState("");
  const [rank, setRank] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  }

  if (auth.status === "loading") return <FullScreenStatus type="loading" />;
  if (auth.status === "unreachable") {
    return (
      <FullScreenStatus type="unreachable" onRetry={() => window.location.reload()} onSignOut={signOut} />
    );
  }

  const userGame =
    userGamesHook.status === "success"
      ? userGamesHook.games.find((g) => g.gameId === gameId) ?? null
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!userGame) { setErrorMsg("Realm not found."); setStatus("error"); return; }

    setStatus("loading");
    setErrorMsg("");
    try {
      await createCharacter({
        name: name.trim(),
        bio: bio.trim() || undefined,
        playstyle: playstyle || undefined,
        rank: rank || undefined,
        region: region || undefined,
        userGameId: userGame.id,
      });
      navigate(`/realm/${gameId}`);
    } catch {
      setErrorMsg("Failed to create character. Please try again.");
      setStatus("error");
    }
  }

  const game = userGame?.game;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
      <NavBar
        rightSlot={
          <Link
            to={`/realm/${gameId}`}
            className="font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200"
          >
            ← Realm
          </Link>
        }
      />

      <main className="flex-1 px-6 md:px-10 py-14 max-w-2xl mx-auto w-full">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-6 bg-brand-neon" />
            <span className="font-mono text-brand-neon text-xs tracking-[0.4em] uppercase">
              {game?.name ?? "Realm"}
            </span>
          </div>
          <h1 className="font-display font-black text-4xl text-brand-text uppercase tracking-wide">
            Create Your<br />
            <span style={{ color: "#00e5ff" }}>Character</span>
          </h1>
          <p className="text-brand-muted mt-3 text-sm leading-relaxed">
            This is how other players will see you. Make it count.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-2">
              Character Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NightShade, IronFang..."
              maxLength={40}
              required
              className="w-full px-4 py-3 font-display text-brand-text placeholder:text-brand-muted/50 outline-none transition-all duration-200 focus:border-brand-neon/60"
              style={{
                background: "rgba(13,13,30,0.8)",
                border: "1px solid rgba(28,28,56,1)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(28,28,56,1)")}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-2">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What kind of player are you? What are you looking for in a teammate?"
              maxLength={280}
              rows={4}
              className="w-full px-4 py-3 font-body text-sm text-brand-text placeholder:text-brand-muted/50 outline-none resize-none transition-all duration-200"
              style={{
                background: "rgba(13,13,30,0.8)",
                border: "1px solid rgba(28,28,56,1)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(0,229,255,0.5)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(28,28,56,1)")}
            />
            <div className="font-mono text-[10px] text-brand-muted/50 text-right mt-1">
              {bio.length}/280
            </div>
          </div>

          {/* Playstyle */}
          <div>
            <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">
              Playstyle
            </label>
            <div className="flex flex-wrap gap-2">
              {PLAYSTYLES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlaystyle(playstyle === p ? "" : p)}
                  className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
                  style={{
                    background: playstyle === p ? "rgba(0,229,255,0.15)" : "rgba(13,13,30,0.6)",
                    border: playstyle === p ? "1px solid rgba(0,229,255,0.5)" : "1px solid rgba(28,28,56,1)",
                    color: playstyle === p ? "#00e5ff" : "#6e6e99",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Rank */}
          <div>
            <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">
              Rank
            </label>
            <div className="flex flex-wrap gap-2">
              {RANKS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRank(rank === r ? "" : r)}
                  className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
                  style={{
                    background: rank === r ? "rgba(255,215,0,0.12)" : "rgba(13,13,30,0.6)",
                    border: rank === r ? "1px solid rgba(255,215,0,0.4)" : "1px solid rgba(28,28,56,1)",
                    color: rank === r ? "#ffd700" : "#6e6e99",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="font-mono text-[11px] tracking-widest uppercase text-brand-muted block mb-3">
              Region
            </label>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(region === r ? "" : r)}
                  className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 transition-all duration-150"
                  style={{
                    background: region === r ? "rgba(124,58,237,0.15)" : "rgba(13,13,30,0.6)",
                    border: region === r ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(28,28,56,1)",
                    color: region === r ? "#a78bfa" : "#6e6e99",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <p className="font-mono text-brand-crimson text-xs border border-brand-crimson/30 bg-brand-crimson/10 px-4 py-3 tracking-wide">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || status === "loading"}
            className="w-full py-4 font-display font-black text-sm tracking-widest uppercase text-brand-bg transition-all duration-200 hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: "linear-gradient(135deg, #00e5ff, #0088ff)",
              boxShadow: name.trim() ? "0 0 30px rgba(0,229,255,0.3)" : "none",
            }}
          >
            {status === "loading" ? "Creating..." : "Create Character →"}
          </button>
        </form>
      </main>

      <Footer />
    </div>
  );
}
