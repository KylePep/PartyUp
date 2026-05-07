import { useMemo } from "react";
import { useMatches } from "../hooks/useMatches";
import { CharacterCard } from "../components/cards/CharacterCard";
import { MatchCard } from "../components/cards/MatchCard";
import { FullScreenStatus } from "../components/layout/FullScreenStatus";
import type { CharacterSummary } from "../api/endpoints/matches";
import type { Character } from "../api/endpoints/characters";

export default function MatchesPage() {
  const { data, loading } = useMatches();

  const grouped = useMemo(() => {
    type GameGroup = {
      gameName: string;
      byCharacter: Record<string, {
        myCharacter: CharacterSummary;
        matches: { matchId: string; matchedAt: string; theirCharacter: CharacterSummary }[];
      }>;
    };

    const result: Record<string, GameGroup> = {};

    for (const match of data) {
      if (!result[match.gameId]) {
        result[match.gameId] = { gameName: match.gameName, byCharacter: {} };
      }
      const game = result[match.gameId];
      const charId = match.myCharacter.id;
      if (!game.byCharacter[charId]) {
        game.byCharacter[charId] = { myCharacter: match.myCharacter, matches: [] };
      }
      game.byCharacter[charId].matches.push({
        matchId: match.matchId,
        matchedAt: match.matchedAt,
        theirCharacter: match.theirCharacter,
      });
    }

    return result;
  }, [data]);

  if (loading) return <FullScreenStatus type="loading" />;

  const isEmpty = Object.keys(grouped).length === 0;

  return (
    <div className="px-6 md:px-10 py-10 max-w-7xl mx-auto w-full">
      <h1
        className="font-display font-black text-3xl uppercase tracking-widest text-brand-text mb-10"
        style={{ textShadow: "0 0 30px rgba(255,0,128,0.3)" }}
      >
        Matches
      </h1>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-mono text-brand-muted tracking-widest uppercase text-sm">
            No matches yet — start swiping in your Realms.
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([gameId, game]) => (
        <div key={gameId} className="mb-12">
          <div className="border-b border-brand-border pb-3 mb-6">
            <h2 className="font-display font-black text-2xl uppercase tracking-wide text-brand-text">
              {game.gameName}
            </h2>
          </div>

          {Object.entries(game.byCharacter).map(([charId, charGroup]) => (
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
        </div>
      ))}
    </div>
  );
}
