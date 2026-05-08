import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useSignedInLayout } from "../components/layout/SignedInLayout";
import { useUserGames } from "../hooks/useUserGame";
import { useMatches } from "../hooks/useMatches";
import {
  discoverCharacters,
  interactWithCharacter,
  type Character,
  type DiscoverCharacter,
  getUserGameCharacters,
} from "../api/endpoints/characters";
import { GameBanner } from "../components/ui/GameBanner";
import { MatchBanner } from "../components/ui/MatchBanner";
import { CharacterPanel } from "../components/ui/CharacterPanel";
import { DiscoveryPanel } from "../components/ui/DiscoveryPanel";
import { CharacterCard } from "../components/cards/CharacterCard";
import { MatchCard } from "../components/cards/MatchCard";
import type { CharacterSummary } from "../api/endpoints/matches";

type Tab = "discover" | "matches";

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { setNavExtra } = useSignedInLayout();
  const userGamesHook = useUserGames();
  const { data: matchData, loading: matchesLoading } = useMatches(gameId);

  const [tab, setTab] = useState<Tab>("discover");
  const [myCharacter, setMyCharacter] = useState<Character | null | "loading">("loading");
  const [discoverQueue, setDiscoverQueue] = useState<DiscoverCharacter[]>([]);
  const [discoverStatus, setDiscoverStatus] = useState<"loading" | "ready" | "empty" | "unavailable">("loading");
  const [matchBanner, setMatchBanner] = useState(false);

  const userGame =
    userGamesHook.status === "success"
      ? userGamesHook.games.find((g) => g.gameId === gameId) ?? null
      : null;

  useEffect(() => {
    setNavExtra(
      <Link
        to="/home"
        className="font-mono text-xs tracking-widest uppercase px-4 py-2 text-brand-muted border border-brand-border hover:border-brand-muted hover:text-brand-text transition-all duration-200"
      >
        ← Hub
      </Link>
    );
    return () => setNavExtra(null);
  }, [setNavExtra]);

  useEffect(() => {
    if (!userGame) return;
    getUserGameCharacters(userGame.id)
      .then((chars) => {
        const mine = chars.find((c) => c.userGameId === userGame.id) ?? null;
        setMyCharacter(mine);
      })
      .catch(() => setMyCharacter(null));
  }, [userGame?.id]);

  useEffect(() => {
    if (!gameId) return;
    discoverCharacters(gameId)
      .then((chars) => {
        setDiscoverQueue(chars);
        setDiscoverStatus(chars.length === 0 ? "empty" : "ready");
      })
      .catch(() => setDiscoverStatus("unavailable"));
  }, [gameId]);

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

  const matchesByCharacter = useMemo(() => {
    const result: Record<string, {
      myCharacter: CharacterSummary;
      matches: { matchId: string; matchedAt: string; theirCharacter: CharacterSummary }[];
    }> = {};
    for (const match of matchData) {
      const charId = match.myCharacter.id;
      if (!result[charId]) result[charId] = { myCharacter: match.myCharacter, matches: [] };
      result[charId].matches.push({
        matchId: match.matchId,
        matchedAt: match.matchedAt,
        theirCharacter: match.theirCharacter,
      });
    }
    return result;
  }, [matchData]);

  return (
    <>
      {matchBanner && <MatchBanner />}
      <GameBanner game={userGame} />

      <div className="px-6 md:px-10 max-w-7xl mx-auto w-full">
        <div className="flex gap-0 border-b border-brand-border mt-6">
          <button
            onClick={() => setTab("discover")}
            className={`font-mono text-xs tracking-widest uppercase px-6 py-3 transition-all duration-200 ${tab === "discover"
              ? "text-brand-neon border-b-2 border-brand-neon -mb-px"
              : "text-brand-muted hover:text-brand-text"
              }`}
          >
            Discover
          </button>
          <button
            onClick={() => setTab("matches")}
            className={`font-mono text-xs tracking-widest uppercase px-6 py-3 transition-all duration-200 ${tab === "matches"
              ? "text-brand-neon border-b-2 border-brand-neon -mb-px"
              : "text-brand-muted hover:text-brand-text"
              }`}
          >
            Matches
          </button>
        </div>
      </div>

      {tab === "discover" && (
        <main className="flex-1 px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <CharacterPanel
              gameId={gameId}
              myCharacter={myCharacter}
              userGame={userGame}
              userGamesLoading={userGamesHook.status === "loading"}
            />
            <DiscoveryPanel
              myCharacter={myCharacter}
              discoverQueue={discoverQueue}
              discoverStatus={discoverStatus}
              onLike={handleLike}
              onDislike={handleDislike}
            />
          </div>
        </main>
      )}

      {tab === "matches" && (
        <main className="flex-1 px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
          {matchesLoading && (
            <p className="font-mono text-brand-muted tracking-widest uppercase text-sm">Loading...</p>
          )}
          {!matchesLoading && Object.keys(matchesByCharacter).length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="font-mono text-brand-muted tracking-widest uppercase text-sm">
                No matches yet for this realm.
              </p>
            </div>
          )}
          {!matchesLoading && Object.entries(matchesByCharacter).map(([charId, charGroup]) => (
            <div key={charId} className="mb-8">
              <div className="flex items-start gap-4 overflow-x-auto pb-4">
                <div className="flex-shrink-0 w-64">
                  <CharacterCard
                    gameId={gameId}
                    character={charGroup.myCharacter as Character}
                  />
                </div>
                {charGroup.matches.map((m) => (
                  <div key={m.matchId} className="flex-shrink-0 w-64">
                    <MatchCard character={m.theirCharacter} matchedAt={m.matchedAt} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
      )}
    </>
  );
}
