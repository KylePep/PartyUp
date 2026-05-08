import { useEffect, useState } from "react";
import type { Game, GameDetails } from "../../api/endpoints/games";
import { getGameDetails } from "../../api/endpoints/games";
import { CornerAccents } from "../ui/CornerAccents";
import { Modal } from "./Modal";

export type AddState = "idle" | "loading" | "success" | "conflict" | "error";

type Props = {
  game: Game;
  addState: AddState;
  onConfirm: () => void;
  onClose: () => void;
};

export function GameSelectModal({ game, addState, onConfirm, onClose }: Props) {
  const [details, setDetails] = useState<GameDetails | null>(null);

  useEffect(() => {
    getGameDetails(game.externalId).then(setDetails).catch(() => {});
  }, [game.externalId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const done = addState === "success" || addState === "conflict";

  return (
    <Modal isOpen onClose={onClose} titleId="select-game-modal-title">
      <div className="bg-brand-surface border border-brand-border w-full overflow-hidden">
        <CornerAccents />

        {game.imageUrl && (
          <div className="relative overflow-hidden">
            <img
              src={game.imageUrl}
              alt={game.name}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6 flex flex-col gap-4">
          <div>
            <h2 className="font-display text-brand-text text-base leading-snug">
              {game.name}
            </h2>
            <p className="text-brand-muted text-xs mt-1 font-display tracking-wide">
              Add this game to your collection?
            </p>
          </div>

          {details && (
            <div className="flex flex-col gap-2">
              {details.description && (
                <p className="text-brand-muted text-xs font-display leading-relaxed line-clamp-3">
                  {details.description}
                </p>
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

          {addState === "success" && (
            <p className="text-brand-gold text-xs font-display tracking-wide border border-brand-gold/30 bg-brand-gold/10 px-3 py-2">
              Added to your collection.
            </p>
          )}
          {addState === "conflict" && (
            <p className="text-brand-muted text-xs font-display tracking-wide border border-brand-border px-3 py-2">
              Already in your collection.
            </p>
          )}
          {addState === "error" && (
            <p className="text-brand-crimson text-xs font-display tracking-wide border border-brand-crimson/30 bg-brand-crimson/10 px-3 py-2">
              Something went wrong. Try again.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-brand-border text-brand-muted text-sm px-4 py-2 hover:border-brand-gold/40 hover:text-brand-text transition-colors duration-200 font-display tracking-wider"
            >
              {done ? "Close" : "Cancel"}
            </button>

            {!done && (
              <button
                onClick={onConfirm}
                disabled={addState === "loading"}
                className="flex-1 border border-brand-gold/60 bg-brand-gold/10 text-brand-gold text-sm px-4 py-2 hover:bg-brand-gold/20 transition-colors duration-200 font-display tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addState === "loading" ? "Adding..." : "Add Game"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
