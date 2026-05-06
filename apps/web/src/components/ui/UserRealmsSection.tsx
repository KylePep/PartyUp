import { type UserGame } from "../../api/endpoints/userGames";
import { RealmCard } from "../cards/RealmCard";

type Props = {
  userGames: UserGame[];
  onRealmSelect: (userGame: UserGame) => void;
  showSearch: boolean;
  onToggleSearch: () => void;
};

export function UserRealmsSection({ userGames, onRealmSelect, showSearch, onToggleSearch }: Props) {
  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">
            Your Collection
          </span>
          <h2 className="font-display font-bold text-2xl text-brand-text uppercase tracking-wide">
            Your Realms
          </h2>
        </div>
        <button
          onClick={onToggleSearch}
          className="font-mono text-xs tracking-widest uppercase px-5 py-2.5 transition-all duration-200"
          style={{
            background: showSearch ? "rgba(0,229,255,0.1)" : "transparent",
            border: "1px solid",
            borderColor: showSearch ? "rgba(0,229,255,0.5)" : "rgba(110,110,153,0.4)",
            color: showSearch ? "#00e5ff" : "#6e6e99",
          }}
        >
          {showSearch ? "✕ Close" : "+ Add Realm"}
        </button>
      </div>

      {userGames.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {userGames.map((ug) => (
            <RealmCard key={ug.id} userGame={ug} onClick={onRealmSelect} />
          ))}
        </div>
      ) : (
        <div
          className="rounded-lg border border-dashed border-brand-border p-16 text-center"
          style={{ background: "rgba(13,13,30,0.4)" }}
        >
          <div className="text-4xl mb-4 text-brand-muted">◈</div>
          <p className="font-display font-bold text-brand-text text-sm uppercase tracking-wide mb-2">
            No Realms Yet
          </p>
          <p className="text-brand-muted text-sm mb-6">
            Add a game to start matching with other players.
          </p>
          <button
            onClick={onToggleSearch}
            className="font-mono text-xs tracking-widest uppercase px-6 py-2.5 text-brand-neon border border-brand-neon/40 hover:border-brand-neon hover:bg-brand-neon/10 transition-all duration-200"
          >
            Discover Games
          </button>
        </div>
      )}
    </section>
  );
}
