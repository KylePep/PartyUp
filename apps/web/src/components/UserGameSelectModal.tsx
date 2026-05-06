import { useEffect } from "react";
import { CornerAccents } from "./CornerAccents";
import { Modal } from "./Modal";
import type { UserGame } from "../api/endpoints/userGames";

export type DeleteState = "idle" | "loading" | "success" | "conflict" | "error";

type Props = {
  userGame: UserGame;
  deleteState: DeleteState;
  onConfirm: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function UserGameSelectModal({ userGame, deleteState, onConfirm, onDelete, onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const done = deleteState === "success" || deleteState === "conflict";
  const game = userGame

  function handleDeleteClick() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this realm?"
    );

    if (!confirmed) return;

    onDelete();
  }


  return (
    <Modal
      isOpen
      onClose={onClose}
      titleId="select-game-modal-title"
    >

      <div className="bg-brand-surface border border-brand-border w-full overflow-hidden">
        <CornerAccents />

        {game.gameImageUrl && (
          <div className="relative overflow-hidden">
            <img
              src={game.gameImageUrl}
              alt={game.gameName}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6 flex flex-col gap-4">
          <div>
            <h2 className="font-display text-brand-text text-base leading-snug">
              {game.gameName}
            </h2>
            <p className="text-brand-muted text-xs mt-1 font-display tracking-wide">
              Proceed with this realm?
            </p>
          </div>

          {deleteState === "success" && (
            <p className="text-brand-gold text-xs font-display tracking-wide border border-brand-gold/30 bg-brand-gold/10 px-3 py-2">
              Realm Deleted.
            </p>
          )}
          {deleteState === "conflict" && (
            <p className="text-brand-muted text-xs font-display tracking-wide border border-brand-border px-3 py-2">
              Realm already deleted.
            </p>
          )}
          {deleteState === "error" && (
            <p className="text-brand-crimson text-xs font-display tracking-wide border border-brand-crimson/30 bg-brand-crimson/10 px-3 py-2">
              Something went wrong. Try again.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDeleteClick}
              className="flex-1 border border-brand-border bg-brand-crimson/10 text-brand-muted text-sm px-4 py-2 hover:bg-brand-crimson/20 hover:border-brand-crimson/40 hover:text-brand-text transition-colors duration-200 font-display tracking-wider"
            >
              {done ? "Realm Deleted" : "Delete Realm"}
            </button>

            <button
              onClick={onClose}
              className="flex-1 border border-brand-border text-brand-muted text-sm px-4 py-2 hover:border-brand-gold/40 hover:text-brand-text transition-colors duration-200 font-display tracking-wider"
            >
              {done ? "Close" : "Cancel"}
            </button>

            {!done && (
              <button
                onClick={onConfirm}
                disabled={deleteState === "loading"}
                className="flex-1 border border-brand-gold/60 bg-brand-gold/10 text-brand-gold text-sm px-4 py-2 hover:bg-brand-gold/20 transition-colors duration-200 font-display tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteState === "loading" ? "Adding..." : "Enter Realm"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
