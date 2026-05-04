import type { Game } from "../api/endpoints/games";
import { GameCard } from "./GameCard";

type Props<T> = {
  items: T[];
  getGame: (item: T) => Game;
  onSelect?: (item: T) => void;
};


export function GameGrid<T>({
  items,
  getGame,
  onSelect,
}: Props<T>) {
  if (!items.length) {
    return (
      <p className="text-brand-muted text-sm text-center py-12">
        No games found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((item) => {
        const game = getGame(item);

        return (
          <GameCard
            key={game.id}
            game={game}
            onSelect={onSelect ? () => onSelect(item) : undefined}
          />
        );
      })}
    </div>
  );
}


