import type { Game } from "../api/endpoints/games";
import { GameCard } from "./GameCard";

type Props = {
  games: Game[];
};

export function GameGrid({ games }: Props) {
  if (!games.length) {
    return <div>No games found.</div>;
  }

  return (
    <section className="game-grid">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </section>
  );
}
