import type { UserGame } from "../../api/endpoints/userGames";

interface Props {
  userGame: UserGame;
  onClick: (userGame: UserGame) => void;
}

export function RealmCard({ userGame, onClick }: Props) {

  return (
    <button
      onClick={() => onClick(userGame)}
      className="group relative overflow-hidden rounded-lg text-left transition-all duration-300 hover:scale-[1.02] w-full"
      style={{ background: "rgba(13,13,30,0.8)", border: "1px solid rgba(0,229,255,0.15)" }}
    >
      {/* Game art */}
      <div className="relative h-40 overflow-hidden">
        {userGame.gameImageUrl ? (
          <img
            src={userGame.gameImageUrl}
            alt={userGame.gameName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-brand-surface-raised flex items-center justify-center">
            <span className="font-display font-bold text-brand-muted text-4xl">◈</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.1), rgba(255,0,128,0.1))" }}
        />
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="font-mono text-[10px] text-brand-neon/60 tracking-widest uppercase mb-1">
          Realm
        </div>
        <h3 className="font-display font-bold text-brand-text text-sm uppercase tracking-wide truncate">
          {userGame.gameName}
        </h3>
      </div>

      {/* Enter label */}
      <div
        className="absolute top-3 right-3 font-mono text-[9px] tracking-widest uppercase px-2 py-1 opacity-0 group-hover:opacity-100 transition-all duration-200"
        style={{
          background: "rgba(0,229,255,0.15)",
          border: "1px solid rgba(0,229,255,0.4)",
          color: "#00e5ff",
        }}
      >
        Enter →
      </div>

      {/* Glow border on hover */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: "inset 0 0 0 1px rgba(0,229,255,0.4), 0 0 20px rgba(0,229,255,0.1)" }}
      />
    </button>
  );
}
