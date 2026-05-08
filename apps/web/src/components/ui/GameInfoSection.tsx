import type { UserGameDetail } from "../../api/endpoints/userGames";

type Props = {
  userGameDetail: UserGameDetail | null;
};

export function GameInfoSection({ userGameDetail }: Props) {
  if (!userGameDetail || !userGameDetail.description) return null;

  return (
    <div className="px-6 md:px-10 max-w-7xl mx-auto w-full mt-6">
      <div className="border border-brand-border bg-brand-surface/50 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-px w-6 bg-brand-neon" />
          <span className="font-mono text-brand-neon text-xs tracking-[0.4em] uppercase">
            About
          </span>
        </div>

        <div
          className="text-brand-muted text-sm font-display leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: userGameDetail.description }}
        />

        <div className="flex flex-wrap items-center gap-4">
          {userGameDetail.rating > 0 && (
            <span className="font-mono text-brand-neon text-xs tracking-widest">
              Rating: {userGameDetail.rating.toFixed(1)}
            </span>
          )}

          {userGameDetail.platforms.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {userGameDetail.platforms.map((p) => (
                <span
                  key={p}
                  className="text-brand-muted text-xs font-mono border border-brand-border px-2 py-0.5"
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          {userGameDetail.website && (
            <a
              href={userGameDetail.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-neon text-xs font-mono tracking-wide hover:underline"
            >
              {userGameDetail.website}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
