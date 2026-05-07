import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { addUserGame, deleteUserGame, type UserGame } from "../api/endpoints/userGames";
import { type Game } from "../api/endpoints/games";
import { HttpError } from "../api/client";
import { GameSelectModal, type AddState } from "../components/modals/GameSelectModal";
import { useUserGames } from "../hooks/useUserGame";
import { UserGameSelectModal } from "../components/modals/UserGameSelectModal";
import { UserRealmsSection } from "../components/ui/UserRealmsSection";
import { GameSearchSection } from "../components/forms/GameSearchSection";

export default function HomePage() {
  const navigate = useNavigate();
  const { state: auth } = useAuth();
  const userGames = useUserGames();
  const userGamesData = userGames.status === "success" ? userGames.games : [];

  const [showSearch, setShowSearch] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedUserGame, setSelectedUserGame] = useState<UserGame | null>(null);
  const [addState, setAddState] = useState<AddState>("idle");
  const [deleteState, setDeleteState] = useState<AddState>("idle");

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

  if (auth.status !== "authenticated") return null;
  const { username } = auth.user;

  return (
    <>
      <main className="flex-1 px-6 md:px-10 py-12 max-w-7xl mx-auto w-full">
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

        <UserRealmsSection
          userGames={userGamesData}
          onRealmSelect={handleUserGameSelect}
          showSearch={showSearch}
          onToggleSearch={() => setShowSearch((s) => !s)}
        />

        {showSearch && <GameSearchSection onGameSelect={handleGameSelect} />}
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
