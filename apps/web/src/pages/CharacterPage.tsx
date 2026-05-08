import { CharacterCard } from "../components/cards/CharacterCard";
import { useCharacters } from "../hooks/useCharacters";
import { useUserGames } from "../hooks/useUserGame";
import { FullScreenStatus } from "../components/layout/FullScreenStatus";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSignedInLayout } from "../components/layout/SignedInLayout";

export default function CharactersPage() {
  const { data, loading } = useCharacters();
  const { setNavExtra } = useSignedInLayout();
  const userGamesHook = useUserGames();

  const userGames =
    userGamesHook.status === "success" ? userGamesHook.games : [];

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

  if (loading) return <FullScreenStatus type="loading" />;

  const groupedCharacters = data.reduce((groups, character) => {
    const key = character.userGameId ?? "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(character);
    return groups;
  }, {} as Record<string, typeof data>);

  const isEmpty = Object.keys(groupedCharacters).length === 0;

  return (
    <div className="px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
      <h1
        className="font-display font-black text-3xl uppercase tracking-widest text-brand-text mb-10"
        style={{ textShadow: "0 0 30px rgba(0,229,255,0.3)" }}
      >
        Characters
      </h1>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-mono text-brand-muted tracking-widest uppercase text-sm">
            No characters yet — visit a Realm to create one.
          </p>
        </div>
      )}

      {Object.entries(groupedCharacters).map(([userGameId, characters]) => {
        const userGame = userGames.find((ug) => ug.id === userGameId);
        return (
          <div key={userGameId} className="mb-12">
            <div className="border-b border-brand-border pb-3 mb-6">
              <h2 className="font-display font-black text-2xl uppercase tracking-wide text-brand-text">
                {userGame?.gameName ?? "Unknown Game"}
              </h2>
            </div>
            <div className="flex flex-wrap gap-4">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  gameId={userGame?.gameId}
                  character={character}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
