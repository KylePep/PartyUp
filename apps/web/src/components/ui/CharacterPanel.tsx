import { Link } from "react-router-dom";
import { type Character } from "../../api/endpoints/characters";
import { type UserGame } from "../../api/endpoints/userGames";
import { CharacterCard } from "../cards/CharacterCard";

type Props = {
  gameId: string | undefined;
  myCharacter: Character | null | "loading";
  userGame: UserGame | null;
  userGamesLoading: boolean;
};

export function CharacterPanel({ gameId, myCharacter, userGame, userGamesLoading }: Props) {
  return (
    <section>
      <div className="mb-6">
        <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">Your Identity</span>
        <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">Your Character</h2>
      </div>
      <div style={{ height: "520px" }}>
        {myCharacter === "loading" || userGamesLoading ? (
          <div className="rounded-lg border border-brand-border p-10 text-center" style={{ background: "rgba(13,13,30,0.6)" }}>
            <p className="font-mono text-brand-muted text-xs tracking-widest uppercase">Loading...</p>
          </div>
        ) : myCharacter ? (
          <CharacterCard gameId={gameId} character={myCharacter} />
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
      </div>
    </section >
  );
}
