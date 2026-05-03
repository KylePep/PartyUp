import type { Game } from "../api/endpoints/games";
import { GameCard } from "./GameCard";

type Props = {
  games: Game[];
};

export function GameGrid({ games }: Props) {
  if (!games.length) {
    return (
      <p className="text-brand-muted text-sm text-center py-12">
        No games found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
