import { useEffect, useState } from "react";
import { CornerAccents } from "../ui/CornerAccents";
import { Modal } from "./Modal";
import type { UserGame, UserGameDetail } from "../../api/endpoints/userGames";
import { getUserGameByGameId } from "../../api/endpoints/userGames";

export type DeleteState = "idle" | "loading" | "success" | "conflict" | "error";

type Props = {
  userGame: UserGame;
  deleteState: DeleteState;
  onConfirm: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function UserGameSelectModal({ userGame, deleteState, onConfirm, onDelete, onClose }: Props) {
  const [details, setDetails] = useState<UserGameDetail | null>(null);

  useEffect(() => {
    getUserGameByGameId(userGame.gameId).then(setDetails).catch(() => { });
  }, [userGame.gameId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const done = deleteState === "success" || deleteState === "conflict";

  function handleDeleteClick() {
    const confirmed = window.confirm("Are you sure you want to delete this realm?");
    if (!confirmed) return;
    onDelete();
  }

  return (
    <Modal isOpen onClose={onClose} titleId="select-game-modal-title">
      <div className="bg-brand-surface border border-brand-border w-full overflow-hidden">
        <CornerAccents />

        {userGame.gameImageUrl && (
          <div className="relative overflow-hidden">
            <img
              src={userGame.gameImageUrl}
              alt={userGame.gameName}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6 flex flex-col gap-4">
          <div>
            <h2 className="font-display text-brand-text text-base leading-snug">
              {userGame.gameName}
            </h2>
            <p className="text-brand-muted text-xs mt-1 font-display tracking-wide">
              Proceed with this realm?
            </p>
          </div>

          {details && (
            <div className="flex flex-col gap-2">
              {details.description && (
                <div className="text-brand-muted text-xs font-display leading-relaxed line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: details.description }} />
              )}
              {details.rating > 0 && (
                <p className="text-brand-neon text-xs font-mono tracking-widest">
                  Rating: {details.rating.toFixed(1)}
                </p>
              )}
              {details.platforms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {details.platforms.map((p) => (
                    <span
                      key={p}
                      className="text-brand-muted text-xs font-mono border border-brand-border px-2 py-0.5"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
              {details.website && (
                <a
                  href={details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-neon text-xs font-mono tracking-wide hover:underline"
                >
                  {details.website}
                </a>
              )}
            </div>
          )}

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
