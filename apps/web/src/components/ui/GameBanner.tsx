import type { UserGame } from "../../api/endpoints/userGames";

type GameBannerProps = {
  game: UserGame | null
}

export function GameBanner({ game }: GameBannerProps) {
  return (
    <div className="relative h-48 overflow-hidden shrink-0">
      {game?.gameImageUrl ? (
        <img src={game.gameImageUrl} alt={game.gameName} className="w-full h-full object-cover opacity-30" />
      ) : (
        <div className="w-full h-full" style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.08), rgba(255,0,128,0.08))" }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-brand-bg" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-bg/60 to-transparent" />

      <div className="absolute bottom-6 left-6 md:left-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-6 bg-brand-neon" />
          <span className="font-mono text-brand-neon text-xs tracking-[0.4em] uppercase">Realm</span>
        </div>
        <h1 className="font-display font-black text-3xl md:text-4xl text-brand-text uppercase tracking-wide">
          {game?.gameName ?? "Loading..."}
        </h1>
      </div>
    </div>
  )
}
