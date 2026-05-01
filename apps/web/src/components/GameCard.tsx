import type { Game } from "../api/endpoints/games";

type Props = {
  game: Game;
};

export function GameCard({ game }: Props) {
  return (
    <article className="game-card">
      <img
        src={game.imageUrl}
        alt={game.name}
        className="game-card__image"
      />

      <div className="game-card__content">
        <h2>{game.name}</h2>

        <small>RAWG ID: {game.externalId}</small>
      </div>
    </article>
  );
}
