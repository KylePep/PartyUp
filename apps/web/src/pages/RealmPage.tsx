import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSignedInLayout } from "../components/layout/SignedInLayout";
import { useUserGames } from "../hooks/useUserGame";
import {
  getCharacters,
  discoverCharacters,
  interactWithCharacter,
  type Character,
  type DiscoverCharacter,
} from "../api/endpoints/characters";
import { GameBanner } from "../components/ui/GameBanner";
import { MatchBanner } from "../components/ui/MatchBanner";
import { CharacterPanel } from "../components/ui/CharacterPanel";
import { DiscoveryPanel } from "../components/ui/DiscoveryPanel";

export default function RealmPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { setNavExtra } = useSignedInLayout();
  const userGamesHook = useUserGames();

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

    getCharacters()
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
      .catch(() => {
        setDiscoverStatus("unavailable");
      });
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

  return (
    <>
      {matchBanner && <MatchBanner />}

      <GameBanner game={userGame} />

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
    </>
  );
}
