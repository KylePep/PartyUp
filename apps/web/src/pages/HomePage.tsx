import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getGames, type Game, type PagedGames } from "../api/endpoints/games";
import { addUserGame, deleteUserGame, type UserGame } from "../api/endpoints/userGames";
import { HttpError } from "../api/client";
import { GameGrid } from "../components/ui/GameGrid";
import { GameSearchControls } from "../components/forms/GameSearchControls";
import { Pagination } from "../components/ui/Pagination";
import { GameSelectModal, type AddState } from "../components/modals/GameSelectModal";
import { useUserGames } from "../hooks/useUserGame";
import { UserGameSelectModal } from "../components/modals/UserGameSelectModal";
import { RealmCard } from "../components/cards/RealmCard";

const MMO_GENRE_ID = 59;

type GamesState =
  | { status: "loading" }
  | { status: "success"; data: PagedGames }
  | { status: "error"; message: string };

export default function HomePage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const userGames = useUserGames();
  const userGamesData = userGames.status === "success" ? userGames.games : [];

  const [query, setQuery] = useState("");
  const [mmoOnly, setMmoOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [gamesState, setGamesState] = useState<GamesState>({ status: "loading" });
  const [showSearch, setShowSearch] = useState(false);

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedUserGame, setSelectedUserGame] = useState<UserGame | null>(null);
  const [addState, setAddState] = useState<AddState>("idle");
  const [deleteState, setDeleteState] = useState<AddState>("idle");

  const prevQueryRef = useRef(query);

  useEffect(() => {
    if (!showSearch) return;

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
          .then((data) => { if (!cancelled) setGamesState({ status: "success", data }); })
          .catch(() => {
            if (!cancelled)
              setGamesState({ status: "error", message: "Could not load games. Is the API running?" });
          });
      },
      queryChanged ? 400 : 0
    );

    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, page, mmoOnly, showSearch]);

  function handleQueryChange(value: string) { setQuery(value); setPage(1); }
  function handleMmoToggle() { setMmoOnly((p) => !p); setPage(1); }
  function handleGameSelect(game: Game) { setSelectedGame(game); setAddState("idle"); }
  function handleUserGameSelect(userGame: UserGame) { setSelectedUserGame(userGame); setDeleteState("idle"); }
  function handleModalClose() { setSelectedGame(null); setSelectedUserGame(null); setAddState("idle"); }

  async function handleAddConfirm() {
    if (!selectedGame) return;
    setAddState("loading");
    try {
      const userGame = await addUserGame({
        externalId: selectedGame.externalId,
        name: selectedGame.name,
        imageUrl: selectedGame.imageUrl ?? null,
      });

      userGames.addUserGame(userGame);
      setAddState("success");
    } catch (err: unknown) {
      if (err instanceof HttpError && err.status === 409) setAddState("conflict");
      else setAddState("error");
    }
  }

  async function handleDelete() {
    if (!selectedUserGame) return;
    setDeleteState("loading");
    try {
      await deleteUserGame(selectedUserGame.id);
      userGames.removeGame(selectedUserGame);
      setDeleteState("success");
    } catch (err: unknown) {
      if (err instanceof HttpError && err.status === 409) setDeleteState("conflict");
      else setDeleteState("error");
    }
  }

  const username = auth.status === "authenticated" ? auth.user.username : "";
  const successData = gamesState.status === "success" ? gamesState.data : null;

  return (
    <>
      <main className="flex-1 px-6 md:px-10 py-12 max-w-7xl mx-auto w-full">

        {/* Header */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-6 bg-brand-neon" />
            <span className="font-mono text-brand-neon text-xs tracking-[0.4em] uppercase">
              Welcome Back
            </span>
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl text-brand-text uppercase tracking-wide">
            {username}
          </h1>
        </div>

        {/* Your Realms */}
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
              onClick={() => setShowSearch((s) => !s)}
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

          {userGamesData.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {userGamesData.map((ug) => (
                <RealmCard key={ug.id} userGame={ug} onClick={handleUserGameSelect} />
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
                onClick={() => setShowSearch(true)}
                className="font-mono text-xs tracking-widest uppercase px-6 py-2.5 text-brand-neon border border-brand-neon/40 hover:border-brand-neon hover:bg-brand-neon/10 transition-all duration-200"
              >
                Discover Games
              </button>
            </div>
          )}
        </section>

        {/* Game Search (collapsible) */}
        {showSearch && (
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
              onMmoToggle={handleMmoToggle}
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
                <GameGrid items={successData.games} getGame={(g) => g} onSelect={handleGameSelect} />
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
        )}
      </main>

      {selectedGame && (
        <GameSelectModal
          game={selectedGame}
          addState={addState}
          onConfirm={handleAddConfirm}
          onClose={handleModalClose}
        />
      )}

      {selectedUserGame && (
        <UserGameSelectModal
          userGame={selectedUserGame}
          deleteState={deleteState}
          onConfirm={() => navigate(`/realm/${selectedUserGame.gameId}`)}
          onDelete={handleDelete}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
