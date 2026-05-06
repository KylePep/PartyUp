import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FullScreenStatus } from "../components/FullScreenStatus";
import { NavBar } from "../components/NavBar";
import { Footer } from "../components/Footer";
import { SwipeCard } from "../components/SwipeCard";
import { useAuth } from "../hooks/useAuth";
import { useUserGames } from "../hooks/useUserGame";
import {
  getCharacters,
  discoverCharacters,
  interactWithCharacter,
  type Character,
  type DiscoverCharacter,
} from "../api/endpoints/characters";
import { GameBanner } from "../components/GameBanner";
import { MatchBanner } from "../components/MatchBanner";
import { SignOutButton } from "../components/SignOutButton";

export default function RealmPage() {

  const { gameId } = useParams<{ gameId: string }>();
  const auth = useAuth();
  const userGamesHook = useUserGames();

  const [myCharacter, setMyCharacter] = useState<Character | null | "loading">("loading");
  const [discoverQueue, setDiscoverQueue] = useState<DiscoverCharacter[]>([]);
  const [discoverStatus, setDiscoverStatus] = useState<"loading" | "ready" | "empty" | "unavailable">("loading");
  const [matchBanner, setMatchBanner] = useState(false);

  const userGame =
    userGamesHook.status === "success"
      ? userGamesHook.games.find((g) => g.gameId === gameId) ?? null
      : null;

  // Load user's character for this realm
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    if (!userGame) return;

    getCharacters()
      .then((chars) => {
        const mine = chars.find((c) => c.userGameId === userGame.id) ?? null;
        setMyCharacter(mine);
      })
      .catch(() => setMyCharacter(null));
  }, [auth.status, userGame?.id]);

  // Load characters to discover
  useEffect(() => {
    if (auth.status !== "authenticated") return;
    if (!gameId) return;

    discoverCharacters(gameId)
      .then((chars) => {
        setDiscoverQueue(chars);
        setDiscoverStatus(chars.length === 0 ? "empty" : "ready");
      })
      .catch(() => {
        setDiscoverStatus("unavailable");
      });
  }, [auth.status, gameId]);

  async function handleLike() {
    const current = discoverQueue[0];
    if (!current) return;
    if (myCharacter === "loading" || myCharacter === null) return;
    try {
      const matchResponse = await interactWithCharacter(myCharacter.id, current.id, "Like");
      setMatchBanner(matchResponse.isMatch);
      setTimeout(() => setMatchBanner(false), 2500);
    } catch {
      // interaction may fail gracefully
    }
    setDiscoverQueue((q) => q.slice(1));
    if (discoverQueue.length <= 1) setDiscoverStatus("empty");
  }

  async function handleDislike() {
    const current = discoverQueue[0];
    if (!current) return;
    if (myCharacter === "loading" || myCharacter === null) return;
    try {
      await interactWithCharacter(myCharacter.id, current.id, "Dislike");
    } catch {
      // interaction may fail gracefully
    }
    setDiscoverQueue((q) => q.slice(1));
    if (discoverQueue.length <= 1) setDiscoverStatus("empty");
  }

  if (auth.status === "loading") return <FullScreenStatus type="loading" />;
  if (auth.status === "unreachable") {
    return (
      <FullScreenStatus type="unreachable" onRetry={() => window.location.reload()} />
    );
  }

  const { username } = auth.user;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
      <NavBar
        rightSlot={
          <>
            <Link
              to="/home"
              className="font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200"
            >
              ← Hub
            </Link>
            <span className="font-mono text-[11px] text-brand-muted tracking-widest uppercase hidden sm:block">
              {username}
            </span>
            <SignOutButton />
          </>
        }
      />

      {/* Match banner */}
      {matchBanner && (
        <MatchBanner />
      )}

      {/* Game banner */}
      <GameBanner game={userGame} />

      <main className="flex-1 px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Left: Your Character */}
          <section>
            <div className="mb-6">
              <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Your Identity</span>
              <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">Your Character</h2>
            </div>

            {myCharacter === "loading" || userGamesHook.status === "loading" ? (
              <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.6)" }}>
                <p className="font-mono text-brand-muted text-xs tracking-widest uppercase">Loading...</p>
              </div>
            ) : myCharacter ? (
              <div
                className="rounded-lg p-6 border border-brand-neon/20"
                style={{ background: "rgba(13,13,30,0.8)", boxShadow: "0 0 30px rgba(0,229,255,0.05)" }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-mono text-[10px] text-brand-neon/60 tracking-widest uppercase mb-1">Active</div>
                    <h3 className="font-display font-black text-2xl text-brand-text uppercase tracking-wide">
                      {myCharacter.name}
                    </h3>
                  </div>
                  <Link
                    to={`/realm/${gameId}/create-character`}
                    className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 text-brand-muted border border-brand-border hover:border-brand-muted transition-all duration-200"
                  >
                    Edit
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {myCharacter.playstyle && (
                    <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff" }}>
                      {myCharacter.playstyle}
                    </span>
                  )}
                  {myCharacter.rank && (
                    <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.25)", color: "#ffd700" }}>
                      {myCharacter.rank}
                    </span>
                  )}
                  {myCharacter.region && (
                    <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>
                      {myCharacter.region}
                    </span>
                  )}
                </div>

                {myCharacter.bio && (
                  <p className="text-brand-muted text-sm leading-relaxed">{myCharacter.bio}</p>
                )}
              </div>
            ) : (
              <div
                className="rounded-lg border border-dashed border-brand-border p-10 text-center"
                style={{ background: "rgba(13,13,30,0.4)" }}
              >
                <div className="text-4xl mb-4 text-brand-muted">◈</div>
                <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">
                  No Character Yet
                </p>
                <p className="text-brand-muted text-sm mb-6">
                  Create a character to start matching in this realm.
                </p>
                {userGame && (
                  <Link
                    to={`/realm/${gameId}/create-character`}
                    className="inline-block font-mono text-xs tracking-widest uppercase px-6 py-2.5 text-brand-neon border border-brand-neon/40 hover:border-brand-neon hover:bg-brand-neon/10 transition-all duration-200"
                  >
                    + Create Character
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Right: Discover / Swipe */}
          <section>
            <div className="mb-6">
              <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Matchmaking</span>
              <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">
                Discover Players
                {discoverStatus === "ready" && (
                  <span className="font-mono text-xs text-brand-muted ml-3 normal-case tracking-normal">
                    {discoverQueue.length} remaining
                  </span>
                )}
              </h2>
            </div>

            {!myCharacter || myCharacter === "loading" ? (
              <div
                className="rounded-lg border border-brand-border p-10 text-center"
                style={{ background: "rgba(13,13,30,0.4)" }}
              >
                <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">
                  Create a Character First
                </p>
                <p className="text-brand-muted text-sm">
                  You need a character in this realm before you can match with others.
                </p>
              </div>
            ) : discoverStatus === "loading" ? (
              <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.6)" }}>
                <p className="font-mono text-brand-muted text-xs tracking-widest uppercase">Scanning the realm...</p>
              </div>
            ) : discoverStatus === "empty" ? (
              <div
                className="rounded-lg border border-brand-border p-10 text-center"
                style={{ background: "rgba(13,13,30,0.4)" }}
              >
                <div className="text-4xl mb-4 text-brand-muted">◈</div>
                <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">
                  All Caught Up
                </p>
                <p className="text-brand-muted text-sm">
                  No more characters to discover right now. Check back later.
                </p>
              </div>
            ) : discoverStatus === "unavailable" ? (
              <div
                className="rounded-lg border border-dashed border-brand-pink/30 p-10 text-center"
                style={{ background: "rgba(255,0,128,0.03)" }}
              >
                <div className="text-4xl mb-4" style={{ color: "rgba(255,0,128,0.4)" }}>◈</div>
                <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">
                  Matchmaking Coming Soon
                </p>
                <p className="text-brand-muted text-sm">
                  The discover endpoint isn't live yet — hang tight while we build it out.
                </p>
              </div>
            ) : (
              <div className="relative" style={{ height: "520px" }}>
                {discoverQueue.slice(0, 2).map((char, i) => (
                  <SwipeCard
                    key={char.id}
                    character={char}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    isTop={i === 0}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
