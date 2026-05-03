import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGames, type PagedGames } from "../api/endpoints/games";
import { GameGrid } from "../components/GameGrid";

const MMO_GENRE_ID = 59;

export default function HomePage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") ?? "Adventurer";

  const [query, setQuery] = useState("");
  const [mmoOnly, setMmoOnly] = useState(true);
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<PagedGames | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query — resets page to 1 on change
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/");
      return;
    }
  }, [navigate]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 400);
  }

  function handleMmoToggle() {
    setMmoOnly((prev) => !prev);
    setPage(1);
  }

  // Fetch whenever search params change
  useEffect(() => {
    setLoading(true);
    setError(null);

    getGames({
      q: debouncedQuery || undefined,
      page,
      genres: mmoOnly ? [MMO_GENRE_ID] : undefined,
    })
      .then(setResult)
      .catch(() => setError("Could not load games. Is the API running?"))
      .finally(() => setLoading(false));
  }, [debouncedQuery, page, mmoOnly]);

  function signOut() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/");
  }

  const totalPages = result?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-body flex flex-col">
      {/* ── Navigation ── */}
      <nav className="border-b border-brand-border px-8 py-5 flex items-center justify-between shrink-0">
        <span className="font-display text-brand-gold text-lg tracking-[0.25em] uppercase">
          PartyUp
        </span>
        <div className="flex items-center gap-6">
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
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 px-8 py-12 max-w-7xl mx-auto w-full">
        {/* Section header */}
        <div className="mb-10">
          <p className="font-display text-brand-gold/60 text-xs tracking-[0.5em] uppercase mb-3">
            Choose Your Realm
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-brand-text">
            Your Games
          </h1>
          <div className="flex items-center gap-3 mt-5">
            <div className="h-px w-16 bg-brand-border" />
            <div className="w-1.5 h-1.5 rotate-45 bg-brand-gold/60" />
            <div className="h-px w-16 bg-brand-border" />
          </div>
        </div>

        {/* ── Search & Filter bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Search input */}
          <div className="relative flex-1">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search for a game..."
              aria-label="Search games"
              className="w-full bg-brand-surface border border-brand-border text-brand-text pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-brand-gold transition-colors placeholder:text-brand-muted/50"
            />
          </div>

          {/* MMO toggle */}
          <button
            onClick={handleMmoToggle}
            aria-pressed={mmoOnly}
            className={`flex items-center gap-2.5 px-5 py-3 border text-sm font-display tracking-wider transition-colors duration-200 whitespace-nowrap ${
              mmoOnly
                ? "bg-brand-gold/10 border-brand-gold text-brand-gold"
                : "bg-transparent border-brand-border text-brand-muted hover:border-brand-gold/60 hover:text-brand-gold"
            }`}
          >
            {/* Indicator dot */}
            <span
              className={`w-2 h-2 rotate-45 inline-block transition-colors duration-200 ${
                mmoOnly ? "bg-brand-gold" : "bg-brand-border"
              }`}
            />
            MMO Only
          </button>
        </div>

        {/* Result count */}
        {!loading && !error && result && (
          <p className="text-brand-muted text-xs mb-6 font-display tracking-wide">
            {result.totalCount.toLocaleString()} game
            {result.totalCount !== 1 ? "s" : ""} found
            {mmoOnly && !query && " in the Massively Multiplayer genre"}
          </p>
        )}

        {/* Game list */}
        {loading && (
          <p className="text-brand-muted text-sm py-12 text-center">
            Searching the realms...
          </p>
        )}
        {error && (
          <p className="text-brand-crimson text-sm border border-brand-crimson/30 bg-brand-crimson/10 px-4 py-3 inline-block">
            {error}
          </p>
        )}
        {!loading && !error && <GameGrid games={result?.games ?? []} />}

        {/* ── Pagination ── */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-6 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="flex items-center gap-2 px-5 py-2.5 border border-brand-border text-brand-muted text-sm font-display tracking-wider hover:border-brand-gold/60 hover:text-brand-gold transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-brand-border disabled:hover:text-brand-muted"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Prev
            </button>

            <span className="font-display text-brand-muted text-sm tracking-widest">
              <span className="text-brand-gold">{page}</span>
              {" / "}
              {totalPages.toLocaleString()}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="flex items-center gap-2 px-5 py-2.5 border border-brand-border text-brand-muted text-sm font-display tracking-wider hover:border-brand-gold/60 hover:text-brand-gold transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-brand-border disabled:hover:text-brand-muted"
            >
              Next
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-brand-border py-6 px-8 text-center shrink-0">
        <p className="font-display text-brand-muted/60 text-xs tracking-[0.4em] uppercase">
          PartyUp &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
