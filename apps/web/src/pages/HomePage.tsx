import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getGames, type PagedGames } from "../api/endpoints/games";
import { NavBar } from "../components/NavBar";
import { SectionHeader } from "../components/SectionHeader";
import { Footer } from "../components/Footer";
import { GameGrid } from "../components/GameGrid";
import { GameSearchControls } from "../components/GameSearchControls";
import { Pagination } from "../components/Pagination";
import { FullScreenStatus } from "../components/FullScreenStatus";

const MMO_GENRE_ID = 59;

type GamesState =
  | { status: "loading" }
  | { status: "success"; data: PagedGames }
  | { status: "error"; message: string };

export default function HomePage() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [query, setQuery] = useState("");
  const [mmoOnly, setMmoOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [gamesState, setGamesState] = useState<GamesState>({ status: "loading" });

  // Track whether the text query changed so we can debounce only typing,
  // not page/toggle changes which should fetch immediately.
  const prevQueryRef = useRef(query);

  useEffect(() => {
    if (auth.status !== "authenticated") return;

    const queryChanged = prevQueryRef.current !== query;
    prevQueryRef.current = query;

    let cancelled = false;

    const timer = setTimeout(
      () => {
        getGames({
          q: query || undefined,
          page,
          genres: mmoOnly ? [MMO_GENRE_ID] : undefined,
        })
          .then((data) => {
            if (!cancelled) setGamesState({ status: "success", data });
          })
          .catch(() => {
            if (!cancelled)
              setGamesState({
                status: "error",
                message: "Could not load games. Is the API running?",
              });
          });
      },
      queryChanged ? 400 : 0
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, page, mmoOnly, auth.status]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleMmoToggle() {
    setMmoOnly((prev) => !prev);
    setPage(1);
  }

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  }

  if (auth.status === "loading") {
    return <FullScreenStatus type="loading" />;
  }

  if (auth.status === "unreachable") {
    return (
      <FullScreenStatus
        type="unreachable"
        onRetry={() => window.location.reload()}
        onSignOut={signOut}
      />
    );
  }

  const { username } = auth.user;
  const successData = gamesState.status === "success" ? gamesState.data : null;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-body flex flex-col">
      <NavBar
        rightSlot={
          <>
            <span className="text-brand-muted text-sm">
              Welcome,{" "}
              <span className="text-brand-text font-display tracking-wide">
                {username}
              </span>
            </span>
            <button
              onClick={signOut}
              className="border border-brand-border text-brand-muted text-sm px-4 py-2 hover:border-brand-gold/60 hover:text-brand-gold transition-colors duration-200 font-display tracking-wider"
            >
              Sign Out
            </button>
          </>
        }
      />

      <main className="flex-1 px-8 py-12 max-w-7xl mx-auto w-full">
        <SectionHeader
          overline="Choose Your Realm"
          heading="Your Games"
          as="h1"
          className="mb-10"
        />

        <GameSearchControls
          query={query}
          onQueryChange={handleQueryChange}
          mmoOnly={mmoOnly}
          onMmoToggle={handleMmoToggle}
        />

        {successData && (
          <p className="text-brand-muted text-xs mt-6 mb-2 font-display tracking-wide">
            {successData.totalCount.toLocaleString()} game
            {successData.totalCount !== 1 ? "s" : ""} found
            {mmoOnly && !query && " in the Massively Multiplayer genre"}
          </p>
        )}

        <div className="mt-6">
          {gamesState.status === "loading" && (
            <p className="text-brand-muted text-sm py-12 text-center">
              Searching the realms...
            </p>
          )}
          {gamesState.status === "error" && (
            <p className="text-brand-crimson text-sm border border-brand-crimson/30 bg-brand-crimson/10 px-4 py-3 inline-block">
              {gamesState.message}
            </p>
          )}
          {successData && <GameGrid games={successData.games} />}
        </div>

        {successData && (
          <Pagination
            page={page}
            totalPages={successData.totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(successData.totalPages, p + 1))}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
