import { useEffect, useRef, useState } from "react";
import { getGames, type Game, type PagedGames } from "../../api/endpoints/games";
import { GameSearchControls } from "./GameSearchControls";
import { GameGrid } from "../ui/GameGrid";
import { Pagination } from "../ui/Pagination";

const MMO_GENRE_ID = 59;

type GamesState =
  | { status: "loading" }
  | { status: "success"; data: PagedGames }
  | { status: "error"; message: string };

type Props = {
  onGameSelect: (game: Game) => void;
};

export function GameSearchSection({ onGameSelect }: Props) {
  const [query, setQuery] = useState("");
  const [mmoOnly, setMmoOnly] = useState(true);
  const [excludeAdditions, setExcludeAdditions] = useState(true);
  const [page, setPage] = useState(1);
  const [gamesState, setGamesState] = useState<GamesState>({ status: "loading" });
  const prevQueryRef = useRef(query);

  useEffect(() => {
    const queryChanged = prevQueryRef.current !== query;
    prevQueryRef.current = query;

    let cancelled = false;
    const timer = setTimeout(
      () => {
        getGames({
          q: query || undefined,
          page,
          genres: mmoOnly ? [MMO_GENRE_ID] : undefined,
          exclude_additions: excludeAdditions,
        })
          .then((data) => { if (!cancelled) setGamesState({ status: "success", data }); })
          .catch(() => {
            if (!cancelled)
              setGamesState({ status: "error", message: "Could not load games. Is the API running?" });
          });
      },
      queryChanged ? 400 : 0
    );

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, page, mmoOnly, excludeAdditions]);

  function handleQueryChange(value: string) { setQuery(value); setPage(1); }
  function handleMmoToggle() { setMmoOnly((p) => !p); setPage(1); }
  function handleExcludeAdditionsToggle() { setExcludeAdditions((p) => !p); setPage(1); }

  const successData = gamesState.status === "success" ? gamesState.data : null;

  return (
    <section
      className="rounded-lg border border-brand-border p-8 mb-12"
      style={{ background: "rgba(13,13,30,0.6)" }}
    >
      <div className="mb-6">
        <span className="font-mono text-brand-muted text-xs tracking-widest uppercase block mb-1">
          Discover
        </span>
        <h2 className="font-display font-bold text-xl text-brand-text uppercase tracking-wide">
          Find a Game
        </h2>
      </div>

      <GameSearchControls
        query={query}
        onQueryChange={handleQueryChange}
        mmoOnly={mmoOnly}
        excludeAdditions={excludeAdditions}
        onMmoToggle={handleMmoToggle}
        onExcludeAdditionsToggle={handleExcludeAdditionsToggle}
      />

      {successData && (
        <p className="font-mono text-brand-muted text-[11px] tracking-widest uppercase mt-6 mb-4">
          {successData.totalCount.toLocaleString()} game{successData.totalCount !== 1 ? "s" : ""} found
          {mmoOnly && !query && " · MMO filter active"}
        </p>
      )}

      <div className="mt-4">
        {gamesState.status === "loading" && (
          <p className="font-mono text-brand-muted text-sm py-12 text-center tracking-widest uppercase">
            Scanning realms...
          </p>
        )}
        {gamesState.status === "error" && (
          <p className="font-mono text-brand-crimson text-xs border border-brand-crimson/30 bg-brand-crimson/10 px-4 py-3 inline-block tracking-wide">
            {gamesState.message}
          </p>
        )}
        {successData && (
          <GameGrid items={successData.games} getGame={(g) => g} onSelect={onGameSelect} />
        )}
      </div>

      {successData && (
        <Pagination
          page={page}
          totalPages={successData.totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(successData.totalPages, p + 1))}
        />
      )}
    </section>
  );
}
