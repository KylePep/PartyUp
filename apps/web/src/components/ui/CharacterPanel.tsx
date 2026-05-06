import { Link } from "react-router-dom";
import { type Character } from "../../api/endpoints/characters";
import { type UserGame } from "../../api/endpoints/userGames";

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

      {myCharacter === "loading" || userGamesLoading ? (
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
  );
}
